/**
 * MITHRA Energy Label Analyzer - API Client
 * Handles communication with the backend analysis API
 */

import { API_ENDPOINTS, ERROR_MESSAGES } from '../shared/constants.js';

export class ApiClient {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.timeout = 45000; // 45 seconds to match backend
        this.maxRetries = 2;
        this.retryDelay = 2000; // 2 seconds
        
        // Request queue for managing concurrent requests
        this.activeRequests = new Map();
        this.requestId = 0;
    }

    /**
     * Analyze a single eBay URL
     */
    async analyzeURL(url) {
        try {
            console.log(`📊 API Request: Analyzing ${url}`);
            
            // Check if URL is already being analyzed - reuse existing promise
            if (this.activeRequests.has(url)) return this.activeRequests.get(url);
            
            // Create and store promise for this URL
            const promise = this.makeRequest('POST', API_ENDPOINTS.ANALYZE_EBAY, { url })
                .finally(() => this.activeRequests.delete(url));
            
            this.activeRequests.set(url, promise);
            
            const result = await promise;
            console.log(`✅ API Request completed:`, result);
            return result;
            
        } catch (error) {
            console.error(`❌ API Request failed:`, error.message);
            throw this.transformError(error);
        }
    }

    /**
     * Check server health
     */
    async healthCheck() {
        try {
            const result = await this.makeRequest('GET', API_ENDPOINTS.HEALTH_CHECK, null, {
                timeout: 5000 // Short timeout for health check
            });
            return result;
        } catch (error) {
            console.warn('Health check failed:', error.message);
            return { status: 'unhealthy', error: error.message };
        }
    }

    /**
     * Get server statistics
     */
    async getStats() {
        try {
            return await this.makeRequest('GET', '/api/stats');
        } catch (error) {
            throw this.transformError(error);
        }
    }

    /**
     * Make HTTP request with retry logic
     */
    async makeRequest(method, endpoint, body = null, options = {}) {
        const requestOptions = {
            timeout: options.timeout || this.timeout,
            retries: options.retries !== undefined ? options.retries : this.maxRetries
        };

        let lastError = null;
        
        for (let attempt = 0; attempt <= requestOptions.retries; attempt++) {
            try {
                if (attempt > 0) {
                    console.log(`🔄 Retry attempt ${attempt} for ${method} ${endpoint}`);
                    await this.delay(this.retryDelay * attempt);
                }
                
                const result = await this.performRequest(method, endpoint, body, requestOptions.timeout);
                return result;
                
            } catch (error) {
                lastError = error;
                
                // Don't retry for certain error types
                if (this.shouldNotRetry(error)) {
                    break;
                }
                
                console.warn(`Attempt ${attempt + 1} failed:`, error.message);
            }
        }
        
        throw lastError;
    }

    /**
     * Perform the actual HTTP request
     */
    async performRequest(method, endpoint, body, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const url = `${this.baseURL}${endpoint}`;
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            };
            
            if (body && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(body);
            }
            
            const response = await fetch(url, options);
            
            clearTimeout(timeoutId);
            
            // Handle different response status codes
            if (!response.ok) {
                const errorData = await this.parseErrorResponse(response);
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
            }
            
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
            }
            
            throw error;
        }
    }

    /**
     * Parse error response from server
     */
    async parseErrorResponse(response) {
        try {
            const errorData = await response.json();
            return errorData;
        } catch (parseError) {
            return {
                error: `HTTP ${response.status}: ${response.statusText}`,
                status: response.status
            };
        }
    }

    /**
     * Transform API errors into user-friendly messages
     */
    transformError(error) {
        let message = error.message;
        let code = 'UNKNOWN_ERROR';
        
        // Map specific error patterns to user-friendly messages
        if (message.includes('timeout')) {
            message = ERROR_MESSAGES.TIMEOUT_ERROR;
            code = 'TIMEOUT';
        } else if (message.includes('network') || message.includes('fetch')) {
            message = ERROR_MESSAGES.NETWORK_ERROR;
            code = 'NETWORK';
        } else if (message.includes('Invalid eBay URL') || message.includes('NOT_EBAY_URL')) {
            message = ERROR_MESSAGES.INVALID_URL;
            code = 'INVALID_URL';
        } else if (message.includes('rate limit') || message.includes('Too Many Requests')) {
            message = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
            code = 'RATE_LIMITED';
        } else if (message.includes('Server is still initializing')) {
            message = 'Server is starting up. Please wait and try again.';
            code = 'SERVER_INITIALIZING';
        }
        
        const apiError = new Error(message);
        apiError.code = code;
        apiError.originalError = error;
        
        return apiError;
    }

    /**
     * Determine if an error should not be retried
     */
    shouldNotRetry(error) {
        const noRetryMessages = [
            'Invalid eBay URL',
            'URL is required',
            'rate limit',
            'Too Many Requests',
            'NOT_EBAY_URL',
            'INVALID_URL_FORMAT'
        ];
        
        return noRetryMessages.some(msg => 
            error.message.toLowerCase().includes(msg.toLowerCase())
        );
    }

    /**
     * Check if server is available
     */
    async isServerAvailable() {
        try {
            const health = await this.healthCheck();
            return health.status === 'healthy' || health.status === 'degraded';
        } catch (error) {
            return false;
        }
    }

    /**
     * Wait for server to be ready
     */
    async waitForServer(maxAttempts = 10, interval = 2000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const isAvailable = await this.isServerAvailable();
                if (isAvailable) {
                    console.log('✅ Server is ready');
                    return true;
                }
            } catch (error) {
                console.log(`🔄 Server check attempt ${attempt}/${maxAttempts} failed`);
            }
            
            if (attempt < maxAttempts) {
                console.log(`⏳ Waiting ${interval/1000}s before next attempt...`);
                await this.delay(interval);
            }
        }
        
        console.error('❌ Server is not available after maximum attempts');
        return false;
    }

    /**
     * Get active request count
     */
    getActiveRequestCount() {
        return this.activeRequests.size;
    }

    /**
     * Cancel all active requests (for app shutdown)
     */
    cancelAllRequests() {
        const count = this.activeRequests.size;
        this.activeRequests.clear();
        console.log(`🛑 Cancelled ${count} active requests`);
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Update base URL (for different environments)
     */
    setBaseURL(url) {
        this.baseURL = url.endsWith('/') ? url.slice(0, -1) : url;
        console.log(`🔄 API base URL updated to: ${this.baseURL}`);
    }

    /**
     * Set timeout for requests
     */
    setTimeout(timeoutMs) {
        this.timeout = timeoutMs;
        console.log(`⏱️ API timeout updated to: ${timeoutMs}ms`);
    }

    /**
     * Get request configuration info
     */
    getConfig() {
        return {
            baseURL: this.baseURL,
            timeout: this.timeout,
            maxRetries: this.maxRetries,
            retryDelay: this.retryDelay,
            activeRequests: this.activeRequests.size
        };
    }
}