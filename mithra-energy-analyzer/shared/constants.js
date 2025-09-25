/**
 * MITHRA Energy Label Analyzer - Shared Constants
 * Contains CSS selectors, energy labels, and configuration constants
 * for eBay energy label detection and analysis.
 */

/**
 * CSS Selectors for eBay energy label detection
 * These selectors target specific HTML elements containing energy information
 */
export const ENERGY_SELECTORS = {
    // Main regulatory wrapper containing energy information
    REGULATORY_WRAPPER: '.x-regulatory-wrapper',
    
    // Energy section container
    ENERGY_SECTION: '.vim.x-eek',
    
    // Product fiche (datasheet) link - looks for "Produktdatenblatt" text
    PRODUCT_FICHE: '.x-eek__product-link[href]',
    
    // Energy efficiency icon/rating elements
    ENERGY_ICON: '.ux-eek-icon',
    ENERGY_RATING: '.eek__rating',
    
    // Alternative energy rating selectors
    ENERGY_RATING_ALT: '.x-eek__rating',
    ENERGY_CLASS: '.energy-class',
    
    // Mouseover label elements
    MOUSEOVER_HOST: '.infotip__host',
    MOUSEOVER_MASK: '.infotip__mask',
    MOUSEOVER_IMAGE: '.infotip__mask img, .infotip__content img',
    
    // Additional energy-related selectors
    ENERGY_LABEL_CONTAINER: '.energy-label',
    EFFICIENCY_BADGE: '.efficiency-badge',
    
    // Fallback selectors for different eBay layouts
    ENERGY_INFO: '.energy-info',
    ENERGY_DETAILS: '.energy-details',
    COMPLIANCE_SECTION: '.compliance-section'
};

/**
 * EU Energy Efficiency Labels (ordered from best to worst)
 * Used for validation and pattern matching
 */
export const ENERGY_LABELS = [
    'A+++',
    'A++', 
    'A+',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G'
];

/**
 * Table column definitions for the analysis results
 */
export const TABLE_COLUMNS = {
    URL: 'eBay URL',
    PRODUCT_FICHE: 'Product Fiche Y/N',
    ENERGY_LABEL: 'Energy Label Y/N',
    MOUSEOVER_LABEL: 'Mouseover Energy Label Y/N',
    STATUS: 'Analysis Status',
    LAST_ANALYZED: 'Last Analyzed',
    ERROR_MESSAGE: 'Error Message'
};

/**
 * Analysis status constants
 */
export const ANALYSIS_STATUS = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    COMPLETED: 'Completed',
    ERROR: 'Error',
    SKIPPED: 'Skipped'
};

/**
 * API endpoints for backend communication
 */
export const API_ENDPOINTS = {
    ANALYZE_EBAY: '/api/analyze-ebay',
    HEALTH_CHECK: '/api/health',
    BATCH_ANALYZE: '/api/batch-analyze'
};

/**
 * File processing constants
 */
export const FILE_CONSTANTS = {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    SUPPORTED_FORMATS: ['.csv', '.xlsx', '.xls'],
    CSV_DELIMITERS: [',', ';', '\t', '|'],
    DEFAULT_DELIMITER: ',',
    ENCODING: 'utf-8'
};

/**
 * Scraping configuration - Optimized for eBay Ground Truth Testing
 */
export const SCRAPER_CONFIG = {
    USER_AGENTS: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    ],
    DEFAULT_TIMEOUT: 60000, // 60 seconds - increased for eBay
    NAVIGATION_TIMEOUT: 60000, // 60 seconds - increased for eBay
    WAIT_FOR_SELECTOR_TIMEOUT: 15000, // 15 seconds - increased
    RETRY_ATTEMPTS: 3,
    DELAY_BETWEEN_REQUESTS: 2000, // 2 seconds minimum
    EBAY_MIN_DELAY: 2000, // Minimum delay specifically for eBay
    JITTER_MAX: 1500, // Maximum random jitter to add
    JITTER_MIN: 500, // Minimum random jitter to add
    VIEWPORT: {
        width: 1920,
        height: 1080
    },
    // Additional eBay-specific settings
    SLOW_MO: 100, // Slow down by 100ms to appear more human-like
    CONTENT_WAIT_TIME: 3000, // Wait 3 seconds for dynamic content
    HUMAN_DELAYS: {
        PAGE_LOAD: 3000, // Wait after page load
        BEFORE_ANALYSIS: 1000, // Wait before starting analysis
        BETWEEN_RETRIES: 3000 // Base wait time between retry attempts (multiplied by attempt number)
    }
};

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
    REQUESTS_PER_MINUTE: 30,
    REQUESTS_PER_HOUR: 500,
    BURST_LIMIT: 5,
    COOLDOWN_PERIOD: 60000 // 1 minute
};

/**
 * Error messages and codes
 */
export const ERROR_MESSAGES = {
    INVALID_URL: 'Invalid eBay URL format',
    NETWORK_ERROR: 'Network connection failed',
    TIMEOUT_ERROR: 'Request timeout - page took too long to load',
    PARSE_ERROR: 'Failed to parse page content',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded - please wait',
    FILE_TOO_LARGE: 'File size exceeds maximum limit',
    UNSUPPORTED_FORMAT: 'File format not supported',
    NO_URLS_FOUND: 'No valid URLs found in the uploaded file',
    BROWSER_ERROR: 'Browser automation error',
    SERVER_ERROR: 'Internal server error'
};

/**
 * Regular expressions for URL validation and pattern matching
 */
export const REGEX_PATTERNS = {
    EBAY_URL: /^https?:\/\/(www\.)?ebay\.(com|de|co\.uk|fr|it|es|com\.au|ca|ch|at|nl|be|ie)\//i,
    ENERGY_RATING_TEXT: /\b(A\+{0,3}|[B-G])\b/g,
    PRODUCT_FICHE_TEXT: /produktdatenblatt|product\s+fiche|energy\s+label/gi,
    CSV_DELIMITER_DETECTION: /[,;\t|]/g
};

/**
 * Export format options
 */
export const EXPORT_FORMATS = {
    CSV: 'csv',
    XLSX: 'xlsx',
    JSON: 'json'
};

/**
 * UI configuration constants
 */
export const UI_CONFIG = {
    TABLE_PAGE_SIZE: 100,
    PROGRESS_UPDATE_INTERVAL: 500, // milliseconds
    SEARCH_DEBOUNCE_DELAY: 300, // milliseconds
    NOTIFICATION_DURATION: 5000, // 5 seconds
    ANIMATION_DURATION: 300 // milliseconds
};

/**
 * Validation rules for data processing
 */
export const VALIDATION_RULES = {
    MIN_URL_LENGTH: 10,
    MAX_URL_LENGTH: 2048,
    MAX_ROWS_PER_BATCH: 1000,
    REQUIRED_COLUMNS: ['url'],
    OPTIONAL_COLUMNS: ['product_name', 'category', 'price']
};

/**
 * Default configuration values
 */
export const DEFAULTS = {
    SERVER_PORT: 3000,
    ANALYSIS_BATCH_SIZE: 10,
    MAX_CONCURRENT_REQUESTS: 3,
    TABLE_SORT_COLUMN: 'url',
    TABLE_SORT_DIRECTION: 'asc'
};