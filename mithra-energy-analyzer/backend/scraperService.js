/**
 * MITHRA Energy Label Analyzer - Scraper Service
 * Puppeteer-based web scraping service for eBay energy label detection
 */

import puppeteer from 'puppeteer';
import { 
    ENERGY_SELECTORS, 
    SCRAPER_CONFIG, 
    ERROR_MESSAGES, 
    REGEX_PATTERNS 
} from '../shared/constants.js';
import { domAnalyzer } from './domAnalyzer.js';

/**
 * ScraperService handles browser automation and page scraping
 */
export class ScraperService {
    constructor() {
        this.browser = null;
        this.isInitialized = false;
        this.activePages = new Set();
        this.requestCount = 0;
        this.lastRequestTime = 0;
        
        // Auto-cleanup system
        this.inactivityTimer = null;
        this.INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
        this.lastActivityTime = Date.now();
        
        // Bind methods to preserve context
        this.scrapeEbayURL = this.scrapeEbayURL.bind(this);
        this.cleanup = this.cleanup.bind(this);
        
        // Setup graceful shutdown
        this.setupGracefulShutdown();
    }

    /**
     * Initialize Puppeteer browser with eBay-optimized settings
     */
    async initBrowser() {
        try {
            if (this.browser && !this.browser.isConnected()) {
                await this.closeBrowser();
            }
            
            if (!this.browser) {
                console.log('🚀 Initializing Puppeteer browser with eBay-optimized settings...');
                
                this.browser = await puppeteer.launch({
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-extensions',
                        '--disable-gpu',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-features=TranslateUI',
                        '--disable-ipc-flooding-protection',
                        '--no-first-run',
                        '--no-default-browser-check'
                    ],
                    ignoreDefaultArgs: ['--disable-extensions'],
                    handleSIGINT: false,
                    handleSIGTERM: false,
                    handleSIGHUP: false
                });
                
                // Handle browser disconnect
                this.browser.on('disconnected', () => {
                    console.log('🔌 Browser disconnected');
                    this.browser = null;
                    this.isInitialized = false;
                });
                
                this.isInitialized = true;
                console.log('✅ Browser initialized successfully with anti-detection measures');
                
                // Start inactivity monitoring
                this.startInactivityTimer();
            }
            
            return this.browser;
        } catch (error) {
            console.error('❌ Failed to initialize browser:', error);
            throw new Error(`${ERROR_MESSAGES.BROWSER_ERROR}: ${error.message}`);
        }
    }

    /**
     * Start or reset the inactivity timer for automatic browser cleanup
     */
    startInactivityTimer() {
        // Clear existing timer
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        // Set new timer
        this.inactivityTimer = setTimeout(async () => {
            console.log('🕐 Browser inactive for 5 minutes, performing automatic cleanup...');
            await this.closeBrowser();
        }, this.INACTIVITY_TIMEOUT);
    }

    /**
     * Reset activity timer (called on each browser interaction)
     */
    resetActivityTimer() {
        this.lastActivityTime = Date.now();
        if (this.browser && this.isInitialized) {
            this.startInactivityTimer();
        }
    }

    /**
     * Scrape eBay URL for energy label information
     */
    async scrapeEbayURL(url) {
        if (!url || !REGEX_PATTERNS.EBAY_URL.test(url)) {
            throw new Error(ERROR_MESSAGES.INVALID_URL);
        }

        let page = null;
        
        try {
            // Ensure browser is ready
            if (!this.browser || !this.browser.isConnected()) {
                await this.initBrowser();
            }
            
            // Reset activity timer on each request
            this.resetActivityTimer();
            
            // Rate limiting with longer delay for eBay
            await this.respectRateLimit();
            
            // Create new page with enhanced configuration
            page = await this.browser.newPage();
            this.activePages.add(page);
            
            // Set realistic user agent to avoid detection
            const userAgent = this.getRandomUserAgent();
            await page.setUserAgent(userAgent);
            
            // Set viewport to common resolution
            await page.setViewport({ width: 1920, height: 1080 });
            
            // Configure timeouts for eBay's slower loading
            await page.setDefaultTimeout(60000);
            await page.setDefaultNavigationTimeout(60000);
            
            console.log(`🔍 Navigating to: ${url}`);
            
            // Navigate with retry logic for eBay's anti-bot measures
            let navigationSuccess = false;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (!navigationSuccess && attempts < maxAttempts) {
                attempts++;
                console.log(`  Attempt ${attempts}/${maxAttempts}`);
                
                try {
                    // Use networkidle2 for dynamic content but with longer timeout
                    const response = await page.goto(url, { 
                        waitUntil: 'networkidle2', 
                        timeout: 60000 
                    });
                    
                    // Check if we got a successful response
                    if (response && response.status() < 400) {
                        navigationSuccess = true;
                        console.log(`  ✅ Navigation successful (HTTP ${response.status()})`);
                    } else {
                        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
                    }
                    
                } catch (navigationError) {
                    console.log(`  ❌ Navigation attempt ${attempts} failed:`, navigationError.message);
                    
                    if (attempts < maxAttempts) {
                        // Wait before retry, increasing delay each attempt
                        const retryDelay = 3000 * attempts;
                        console.log(`  ⏳ Waiting ${retryDelay}ms before retry...`);
                        await this.delay(retryDelay);
                    } else {
                        throw navigationError;
                    }
                }
            }
            
            // Additional wait for dynamic content to load completely
            console.log('  ⏳ Waiting for dynamic content...');
            await this.delay(3000);
            
            // Get HTML content
            console.log('  📄 Extracting HTML content...');
            const html = await page.content();
            console.log(`  📊 HTML size: ${Math.round(html.length / 1024)}KB`);

            // Perform DOM-based analysis
            console.log('  🔬 Analyzing DOM structure...');
            const domAnalysis = domAnalyzer.performDetailedAnalysis(html);

            const result = {
                productFiche: domAnalysis.produktdatenblatt ? 'Y' : 'N',
                energyLabel: domAnalysis.energielabel ? 'Y' : 'N', 
                mouseoverLabel: domAnalysis.mouseover ? 'Y' : 'N',
                timestamp: new Date().toISOString(),
                debug: domAnalysis.debug // Include debug information
            };

            console.log(`✅ Analysis complete for: ${url}`);
            console.log(`   Results: Product=${result.productFiche} Energy=${result.energyLabel} Mouseover=${result.mouseoverLabel}`);
            
            return result;
            
        } catch (error) {
            console.warn(`❌ Scraping failed for ${url}:`, error.message);
            
            // Enhanced error handling for common eBay issues
            if (error.message.includes('Navigation timeout') || 
                error.message.includes('Execution context was destroyed')) {
                console.log('  💡 This might be due to eBay\'s anti-bot measures. Try again with longer delays.');
            }
            
            return this.createErrorResult(error);
            
        } finally {
            // Clean up page
            if (page) {
                try {
                    this.activePages.delete(page);
                    await page.close();
                } catch (closeError) {
                    console.warn('Error closing page:', closeError.message);
                }
            }
        }
    }

    /**
     * Create a new page with proper configuration
     */
    async createPage() {
        const page = await this.browser.newPage();
        
        // Set user agent randomly
        const userAgent = this.getRandomUserAgent();
        await page.setUserAgent(userAgent);
        
        // Set viewport
        await page.setViewport(SCRAPER_CONFIG.VIEWPORT);
        
        // Configure page settings
        await page.setDefaultTimeout(SCRAPER_CONFIG.DEFAULT_TIMEOUT);
        await page.setDefaultNavigationTimeout(SCRAPER_CONFIG.NAVIGATION_TIMEOUT);
        
        // Block unnecessary resources for better performance
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            const url = req.url();
            
            // Block images, stylesheets, fonts to speed up loading
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else if (url.includes('google-analytics') || url.includes('doubleclick')) {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        // Handle JavaScript errors
        page.on('pageerror', (error) => {
            console.warn('Page JavaScript error:', error.message);
        });
        
        // Handle console messages for debugging
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.warn('Page console error:', msg.text());
            }
        });
        
        return page;
    }

    /**
     * Navigate to the target page
     */
    async navigateToPage(page, url) {
        try {
            const response = await page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: SCRAPER_CONFIG.NAVIGATION_TIMEOUT 
            });
            
            if (!response) {
                throw new Error('No response received');
            }
            
            const status = response.status();
            if (status >= 400) {
                throw new Error(`HTTP ${status}: ${response.statusText()}`);
            }
            
            // Wait a bit for dynamic content
            await this.delay(2000);
            
        } catch (error) {
            if (error.name === 'TimeoutError') {
                throw new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
            }
            throw new Error(`${ERROR_MESSAGES.NETWORK_ERROR}: ${error.message}`);
        }
    }

    /**
     * Wait for energy label content to load
     */
    async waitForEnergyContent(page) {
        try {
            // Wait for main regulatory wrapper
            await page.waitForSelector(
                ENERGY_SELECTORS.REGULATORY_WRAPPER, 
                { timeout: SCRAPER_CONFIG.WAIT_FOR_SELECTOR_TIMEOUT }
            );
            
            // Give additional time for dynamic content
            await this.delay(3000);
            
        } catch (error) {
            // Energy content might not be present, continue with analysis
            console.log('Energy content selector not found, proceeding with analysis');
        }
    }

    /**
     * Analyze HTML content for energy labels
     */
    async analyzeHTML(html, page) {
        try {
            const result = {
                productFiche: 'N',
                energyLabel: 'N',
                mouseoverLabel: 'N',
                timestamp: new Date().toISOString(),
                details: {}
            };
            
            // Check for Product Fiche
            result.productFiche = await this.checkProductFiche(page, html);
            
            // Check for Energy Label
            result.energyLabel = await this.checkEnergyLabel(page, html);
            
            // Check for Mouseover Label
            result.mouseoverLabel = await this.checkMouseoverLabel(page, html);
            
            return result;
            
        } catch (error) {
            console.error('Error analyzing HTML:', error);
            throw new Error(`${ERROR_MESSAGES.PARSE_ERROR}: ${error.message}`);
        }
    }

    /**
     * Check for Product Fiche (Produktdatenblatt)
     */
    async checkProductFiche(page, html) {
        try {
            // Check using page evaluation for more reliable detection
            const hasProductFiche = await page.evaluate((selector) => {
                const links = document.querySelectorAll(selector);
                for (const link of links) {
                    const text = link.textContent || link.innerText || '';
                    if (text.toLowerCase().includes('produktdatenblatt') || 
                        text.toLowerCase().includes('product fiche') ||
                        text.toLowerCase().includes('energy label')) {
                        return true;
                    }
                }
                return false;
            }, ENERGY_SELECTORS.PRODUCT_FICHE);
            
            if (hasProductFiche) {
                return 'Y';
            }
            
            // Fallback: check HTML text directly
            const lowerHtml = html.toLowerCase();
            if (lowerHtml.includes('produktdatenblatt') || 
                lowerHtml.includes('product fiche')) {
                return 'Y';
            }
            
            return 'N';
            
        } catch (error) {
            console.warn('Error checking product fiche:', error);
            return 'N';
        }
    }

    /**
     * Check for Energy Label
     */
    async checkEnergyLabel(page, html) {
        try {
            // Check for energy rating elements
            const hasEnergyRating = await page.evaluate((selectors) => {
                const energySelectors = [
                    selectors.ENERGY_ICON,
                    selectors.ENERGY_RATING,
                    selectors.ENERGY_RATING_ALT,
                    selectors.ENERGY_CLASS
                ];
                
                for (const selector of energySelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        return true;
                    }
                }
                
                // Check for energy rating text patterns
                const energyPattern = /\b(A\+{0,3}|[B-G])\b/g;
                const bodyText = document.body.textContent || '';
                return energyPattern.test(bodyText);
                
            }, ENERGY_SELECTORS);
            
            if (hasEnergyRating) {
                return 'Y';
            }
            
            // Fallback: check HTML for energy patterns
            if (REGEX_PATTERNS.ENERGY_RATING_TEXT.test(html)) {
                return 'Y';
            }
            
            return 'N';
            
        } catch (error) {
            console.warn('Error checking energy label:', error);
            return 'N';
        }
    }

    /**
     * Check for Mouseover Energy Label
     */
    async checkMouseoverLabel(page, html) {
        try {
            // Check for mouseover/tooltip elements
            const hasMouseoverLabel = await page.evaluate((selectors) => {
                const mouseoverSelectors = [
                    selectors.MOUSEOVER_HOST,
                    selectors.MOUSEOVER_MASK,
                    selectors.MOUSEOVER_IMAGE
                ];
                
                for (const selector of mouseoverSelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        // Check if element has tooltip/mouseover functionality
                        for (const el of elements) {
                            if (el.getAttribute('title') || 
                                el.classList.contains('infotip') ||
                                el.classList.contains('tooltip') ||
                                el.hasAttribute('data-tooltip')) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            }, ENERGY_SELECTORS);
            
            return hasMouseoverLabel ? 'Y' : 'N';
            
        } catch (error) {
            console.warn('Error checking mouseover label:', error);
            return 'N';
        }
    }

    /**
     * Get random user agent
     */
    getRandomUserAgent() {
        const userAgents = SCRAPER_CONFIG.USER_AGENTS;
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    /**
     * Respect rate limiting with enhanced delays for eBay
     */
    async respectRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        // Increased minimum delay for eBay (2-4 seconds)
        const minDelay = SCRAPER_CONFIG.DELAY_BETWEEN_REQUESTS || 2000;
        const ebayMinDelay = Math.max(minDelay, 2000); // At least 2 seconds
        
        if (timeSinceLastRequest < ebayMinDelay) {
            const delay = ebayMinDelay - timeSinceLastRequest;
            console.log(`⏳ Rate limiting: waiting ${delay}ms...`);
            await this.delay(delay);
        }
        
        // Add random jitter to avoid detection patterns (500-1500ms additional)
        const jitter = Math.random() * 1000 + 500;
        await this.delay(jitter);
        
        this.lastRequestTime = Date.now();
        this.requestCount++;
        
        console.log(`📊 Request #${this.requestCount} (${timeSinceLastRequest}ms since last)`);
    }

    /**
     * Create error result
     */
    createErrorResult(error) {
        let errorType = 'Unknown error';
        
        if (error.message.includes('timeout')) {
            errorType = ERROR_MESSAGES.TIMEOUT_ERROR;
        } else if (error.message.includes('network') || error.message.includes('HTTP')) {
            errorType = ERROR_MESSAGES.NETWORK_ERROR;
        } else if (error.message.includes('navigation')) {
            errorType = ERROR_MESSAGES.NETWORK_ERROR;
        }
        
        return {
            productFiche: 'Error',
            energyLabel: 'Error', 
            mouseoverLabel: 'Error',
            error: errorType,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Close browser and cleanup
     */
    async closeBrowser() {
        try {
            // Clear inactivity timer
            if (this.inactivityTimer) {
                clearTimeout(this.inactivityTimer);
                this.inactivityTimer = null;
            }
            
            if (this.browser) {
                console.log('🔄 Closing browser and cleaning up resources...');
                
                // Close all active pages first
                for (const page of this.activePages) {
                    try {
                        await page.close();
                    } catch (error) {
                        console.warn('Error closing page:', error.message);
                    }
                }
                this.activePages.clear();
                
                await this.browser.close();
                this.browser = null;
                this.isInitialized = false;
                
                console.log('✅ Browser closed successfully and resources cleaned up');
            }
        } catch (error) {
            console.error('Error closing browser:', error);
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        await this.closeBrowser();
    }

    /**
     * Setup graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            console.log(`Received ${signal}, performing graceful shutdown...`);
            await this.cleanup();
            process.exit(0);
        };
        
        process.on('SIGINT', gracefulShutdown);
        process.on('SIGTERM', gracefulShutdown);
        process.on('exit', () => {
            console.log('Process exiting...');
        });
    }

    /**
     * Health check method
     */
    async healthCheck() {
        try {
            if (!this.browser || !this.browser.isConnected()) {
                return { status: 'unhealthy', message: 'Browser not initialized' };
            }
            
            const pages = await this.browser.pages();
            return { 
                status: 'healthy', 
                activePagesCount: this.activePages.size,
                totalPagesCount: pages.length,
                requestCount: this.requestCount
            };
        } catch (error) {
            return { 
                status: 'unhealthy', 
                message: error.message 
            };
        }
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            activePagesCount: this.activePages.size,
            requestCount: this.requestCount,
            browserConnected: this.browser ? this.browser.isConnected() : false
        };
    }
}