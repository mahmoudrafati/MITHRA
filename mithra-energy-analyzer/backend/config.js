/**
 * MITHRA Energy Label Analyzer - Server Configuration
 * Contains all server and scraping configuration settings
 */

export const CONFIG = {
    server: {
        port: process.env.PORT || 3000,
        timeout: 30000,
        maxConcurrentRequests: 5,
        cors: {
            origin: [
                'http://localhost:8080', 
                'http://127.0.0.1:8080',
                'http://localhost:3000',
                'http://127.0.0.1:3000'
            ],
            credentials: true
        }
    },
    
    puppeteer: {
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1366,768',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
        ],
        defaultViewport: {
            width: 1366,
            height: 768
        },
        timeout: 60000
    },
    
    scraping: {
        timeout: 45000,
        navigationTimeout: 60000,
        waitUntil: 'domcontentloaded',
        retries: 3,
        retryDelay: 2000,
        delayBetweenRequests: 1500,
        userAgents: [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    },
    
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100, // max requests per window
        skipSuccessfulRequests: false,
        skipFailedRequests: false
    },
    
    logging: {
        level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
        enableRequestLogging: true
    }
};