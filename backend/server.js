/**
 * MITHRA Energy Label Analyzer - Express Server
 * Main server with API routes for eBay energy label analysis
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { ScraperService } from './scraperService.js';
import { EnergyParser } from './energyParser.js';
import { CONFIG } from './config.js';
import { REGEX_PATTERNS, ERROR_MESSAGES } from '../shared/constants.js';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Disable for development
}));

app.use(compression());

// CORS configuration
app.use(cors(CONFIG.server.cors));

// Rate limiting
const limiter = rateLimit({
    windowMs: CONFIG.rateLimit.windowMs,
    max: CONFIG.rateLimit.maxRequests,
    message: {
        error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
        retryAfter: Math.ceil(CONFIG.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from project root directory
const staticPath = path.join(__dirname, '..');
app.use(express.static(staticPath));

// Initialize services
let scraperService = null;
let energyParser = null;
let isServerReady = false;

async function initializeServices() {
    try {
        console.log('🚀 Initializing MITHRA services...');
        
        energyParser = new EnergyParser();
        console.log('✅ Energy Parser initialized');
        
        // Initialize ScraperService but don't start browser yet
        scraperService = new ScraperService();
        console.log('✅ Scraper Service initialized (browser will start on demand)');
        
        isServerReady = true;
        console.log('✅ All services ready');
        
    } catch (error) {
        console.error('❌ Service initialization failed:', error);
        isServerReady = false;
        throw error;
    }
}

// Middleware to check if services are ready and initialize browser on demand
app.use('/api/analyze-ebay', async (req, res, next) => {
    if (!isServerReady) {
        return res.status(503).json({
            error: 'Server is still initializing. Please wait.',
            status: 'initializing'
        });
    }
    
    // Check if browser is initialized, start it if needed
    if (!scraperService.browser || !scraperService.browser.isConnected()) {
        try {
            console.log('🔄 Initializing browser on demand...');
            await scraperService.initBrowser();
            console.log('✅ Browser ready');
        } catch (error) {
            console.error('❌ Failed to initialize browser on demand:', error.message);
            return res.status(503).json({
                error: 'Browser initialization failed. Please try again.',
                status: 'browser_error',
                details: error.message
            });
        }
    }
    
    next();
});

// Request logging middleware
if (CONFIG.logging.enableRequestLogging) {
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`${timestamp} ${req.method} ${req.path} - IP: ${req.ip}`);
        next();
    });
}

// Routes

/**
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                server: 'online',
                energyParser: energyParser ? 'online' : 'offline',
                scraperService: 'checking...'
            }
        };

        if (scraperService) {
            const scraperHealth = await scraperService.healthCheck();
            health.services.scraperService = scraperHealth.status;
        } else {
            health.services.scraperService = 'offline';
        }

        // Overall health status
        const allHealthy = Object.values(health.services).every(status => 
            status === 'online' || status === 'healthy'
        );
        
        if (!allHealthy) {
            health.status = 'degraded';
        }

        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Main eBay URL analysis endpoint
 */
app.post('/api/analyze-ebay', async (req, res) => {
    const startTime = Date.now();
    let url = null;
    
    try {
        url = req.body.url;
        
        // Input validation
        if (!url) {
            return res.status(400).json({
                error: 'URL is required',
                code: 'MISSING_URL'
            });
        }

        if (typeof url !== 'string' || url.length < 10) {
            return res.status(400).json({
                error: ERROR_MESSAGES.INVALID_URL,
                code: 'INVALID_URL_FORMAT'
            });
        }

        // Validate eBay URL
        if (!REGEX_PATTERNS.EBAY_URL.test(url)) {
            return res.status(400).json({
                error: ERROR_MESSAGES.INVALID_URL,
                code: 'NOT_EBAY_URL'
            });
        }

        console.log(`📊 Analyzing URL: ${url}`);

        // Perform scraping and analysis
        const result = await scraperService.scrapeEbayURL(url);
        
        if (result.error) {
            return res.status(422).json({
                error: result.error,
                url: url,
                timestamp: result.timestamp,
                processingTime: Date.now() - startTime
            });
        }

        // Successful analysis
        const response = {
            ...result,
            url: url,
            processingTime: Date.now() - startTime,
            server: 'mithra-analyzer'
        };

        console.log(`✅ Analysis completed for ${url} in ${response.processingTime}ms`);
        res.json(response);

    } catch (error) {
        console.error(`❌ Analysis failed for ${url}:`, error);
        
        let errorResponse = {
            error: ERROR_MESSAGES.SERVER_ERROR,
            url: url,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
        };

        // Provide more specific error messages based on error type
        if (error.message.includes('timeout')) {
            errorResponse.error = ERROR_MESSAGES.TIMEOUT_ERROR;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorResponse.error = ERROR_MESSAGES.NETWORK_ERROR;
        } else if (error.message.includes('parse')) {
            errorResponse.error = ERROR_MESSAGES.PARSE_ERROR;
        }

        res.status(500).json(errorResponse);
    }
});

/**
 * Batch analysis endpoint (for future use)
 */
app.post('/api/analyze-batch', async (req, res) => {
    try {
        const { urls } = req.body;
        
        if (!Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({
                error: 'URLs array is required',
                code: 'MISSING_URLS'
            });
        }

        if (urls.length > 50) {
            return res.status(400).json({
                error: 'Maximum 50 URLs per batch',
                code: 'BATCH_TOO_LARGE'
            });
        }

        res.status(501).json({
            error: 'Batch analysis not yet implemented',
            code: 'NOT_IMPLEMENTED'
        });

    } catch (error) {
        console.error('Batch analysis error:', error);
        res.status(500).json({
            error: ERROR_MESSAGES.SERVER_ERROR
        });
    }
});

/**
 * Get scraper statistics
 */
app.get('/api/stats', (req, res) => {
    try {
        if (!scraperService) {
            return res.status(503).json({
                error: 'Scraper service not available'
            });
        }

        const stats = scraperService.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Express error:', error);
    
    if (res.headersSent) {
        return next(error);
    }
    
    res.status(500).json({
        error: ERROR_MESSAGES.SERVER_ERROR,
        timestamp: new Date().toISOString()
    });
});

// Serve index.html for any non-API routes (SPA support)
app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            error: 'API endpoint not found',
            path: req.path
        });
    }
    
    // Serve index.html for all other routes
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Graceful shutdown
async function gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}, performing graceful shutdown...`);
    
    try {
        if (scraperService) {
            console.log('🔄 Closing scraper service...');
            await scraperService.cleanup();
            console.log('✅ Scraper service closed');
        }
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
}

// Setup signal handlers
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGQUIT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

// Start server
async function startServer() {
    try {
        // Initialize services first
        await initializeServices();
        
        // Start HTTP server
        const PORT = CONFIG.server.port;
        app.listen(PORT, () => {
            console.log(`
🚀 MITHRA Energy Label Analyzer Server
📍 Running on: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/api/health
⚡ Ready for eBay URL analysis!
            `);
        });

    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}

// Start the server
startServer();