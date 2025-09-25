/**
 * MITHRA Energy Label Analyzer - Analysis Engine
 * Coordinates the analysis workflow and progress tracking
 */

import { ANALYSIS_STATUS } from '../shared/constants.js';

export class AnalysisEngine {
    constructor(app) {
        this.app = app;
        this.isProcessing = false;
        this.isPaused = false;
        this.isStopped = false;
        this.currentIndex = 0;
        this.totalRows = 0;
        this.processedRows = 0;
        this.successfulRows = 0;
        this.errorRows = 0;
        
        // Progress tracking
        this.startTime = null;
        this.progressInterval = null;
        
        // Processing queue
        this.processingQueue = [];
        this.maxConcurrentRequests = 3;
        this.activeRequests = new Set();
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for analysis controls
     */
    setupEventListeners() {
        // Analyze buttons
        const analyzeAllBtn = document.getElementById('analyze-all-btn');
        const analyzeSelectedBtn = document.getElementById('analyze-selected-btn');
        
        if (analyzeAllBtn) {
            analyzeAllBtn.addEventListener('click', () => this.analyzeAll());
        }
        
        if (analyzeSelectedBtn) {
            analyzeSelectedBtn.addEventListener('click', () => this.analyzeSelected());
        }
        
        // Control buttons
        const pauseBtn = document.getElementById('pause-analysis-btn');
        const resumeBtn = document.getElementById('resume-analysis-btn');
        const stopBtn = document.getElementById('stop-analysis-btn');
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseAnalysis());
        }
        
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => this.resumeAnalysis());
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopAnalysis());
        }
    }

    /**
     * Analyze all uploaded URLs
     */
    async analyzeAll() {
        if (!this.app.uploadedData || this.app.uploadedData.length === 0) {
            this.app.addStatusMessage('No data available for analysis', 'error');
            return;
        }
        
        await this.startAnalysis(this.app.uploadedData);
    }

    /**
     * Analyze only selected URLs
     */
    async analyzeSelected() {
        if (this.app.selectedRows.size === 0) {
            this.app.addStatusMessage('No rows selected for analysis', 'error');
            return;
        }
        
        const selectedData = this.app.uploadedData.filter((row, index) => 
            this.app.selectedRows.has(row._id || index)
        );
        
        await this.startAnalysis(selectedData);
    }

    /**
     * Start the analysis process
     */
    async startAnalysis(dataToProcess) {
        if (this.isProcessing) {
            this.app.addStatusMessage('Analysis is already in progress', 'warning');
            return;
        }
        
        // Check if server is available
        const serverAvailable = await this.app.apiClient.isServerAvailable();
        if (!serverAvailable) {
            this.app.addStatusMessage('Backend server is not available. Please start the server first.', 'error');
            return;
        }
        
        this.isProcessing = true;
        this.isPaused = false;
        this.isStopped = false;
        this.currentIndex = 0;
        this.processedRows = 0;
        this.successfulRows = 0;
        this.errorRows = 0;
        this.totalRows = dataToProcess.length;
        this.startTime = Date.now();
        
        // Reset processing queue
        this.processingQueue = [...dataToProcess];
        this.activeRequests.clear();
        
        // Update UI
        this.updateControlButtons();
        this.updateProgress(0);
        
        this.app.addStatusMessage(`Starting analysis of ${this.totalRows} URLs...`, 'info');
        
        try {
            // Start progress monitoring
            this.startProgressMonitoring();
            
            // Process URLs with concurrency control
            await this.processWithConcurrency();
            
            // Analysis completed
            this.completeAnalysis();
            
        } catch (error) {
            console.error('Analysis process failed:', error);
            this.app.addStatusMessage(`Analysis failed: ${error.message}`, 'error');
            this.stopAnalysis();
        }
    }

    /**
     * Process URLs with concurrency control
     */
    async processWithConcurrency() {
        const promises = [];
        
        // Start initial batch of requests
        for (let i = 0; i < Math.min(this.maxConcurrentRequests, this.processingQueue.length); i++) {
            promises.push(this.processNextRow());
        }
        
        // Wait for all requests to complete
        await Promise.all(promises);
    }

    /**
     * Process the next row in the queue
     */
    async processNextRow() {
        while (this.processingQueue.length > 0 && !this.isStopped) {
            // Wait if paused
            while (this.isPaused && !this.isStopped) {
                await this.delay(100);
            }
            
            if (this.isStopped) break;
            
            const row = this.processingQueue.shift();
            if (!row) break;
            
            await this.processRow(row);
            
            // Small delay between requests
            if (this.processingQueue.length > 0) {
                await this.delay(500);
            }
        }
    }

    /**
     * Process a single row
     */
    async processRow(row) {
        // Guard against parallel re-queue
        if (row._status === ANALYSIS_STATUS.PROCESSING ||
            row._status === ANALYSIS_STATUS.COMPLETED) return;

        const rowId = row._id || this.currentIndex;
        
        try {
            // Mark as processing BEFORE pushing promise
            row._status = ANALYSIS_STATUS.PROCESSING;
            row._lastAnalyzed = new Date().toISOString();
            this.app.tableManager.updateRowInPlace(row);
            
            // Get URL
            const url = row.url || row[this.app.urlColumn];
            if (!url) {
                throw new Error('No URL found in row');
            }
            
            console.log(`📊 Processing row ${this.processedRows + 1}/${this.totalRows}: ${url}`);
            
            // Add to active requests
            this.activeRequests.add(rowId);
            
            // Analyze URL
            const result = await this.app.apiClient.analyzeURL(url);
            
            // Update row with results
            row._productFiche = result.productFiche;
            row._energyLabelPresent = result.energyLabel;
            row._mouseoverLabel = result.mouseoverLabel;
            row._analysisResult = `F:${result.productFiche} L:${result.energyLabel} M:${result.mouseoverLabel}`;
            row._status = ANALYSIS_STATUS.COMPLETED;
            row._processingTime = result.processingTime;
            
            this.successfulRows++;
            
            console.log(`✅ Row ${this.processedRows + 1} completed:`, result);
            
        } catch (error) {
            console.error(`❌ Row ${this.processedRows + 1} failed:`, error);
            
            row._status = ANALYSIS_STATUS.ERROR;
            row._errorMessage = error.message;
            row._analysisResult = `Error: ${error.message}`;
            
            this.errorRows++;
            this.app.addStatusMessage(`Row ${this.processedRows + 1}: ${error.message}`, 'error');
            
        } finally {
            // Remove from active requests
            this.activeRequests.delete(rowId);
            
            // Update UI
            this.processedRows++;
            this.app.tableManager.updateRowInPlace(row);
            
            // Update progress
            const percentage = (this.processedRows / this.totalRows) * 100;
            this.updateProgress(percentage);
        }
    }

    /**
     * Pause the analysis
     */
    pauseAnalysis() {
        if (!this.isProcessing) return;
        
        this.isPaused = true;
        this.updateControlButtons();
        this.app.addStatusMessage('Analysis paused', 'info');
    }

    /**
     * Resume the analysis
     */
    resumeAnalysis() {
        if (!this.isProcessing || !this.isPaused) return;
        
        this.isPaused = false;
        this.updateControlButtons();
        this.app.addStatusMessage('Analysis resumed', 'info');
    }

    /**
     * Stop the analysis
     */
    stopAnalysis() {
        if (!this.isProcessing) return;
        
        this.isStopped = true;
        this.isProcessing = false;
        this.isPaused = false;
        
        // Cancel active requests
        this.app.apiClient.cancelAllRequests();
        this.activeRequests.clear();
        this.processingQueue = [];
        
        // Stop progress monitoring
        this.stopProgressMonitoring();
        
        // Update UI
        this.updateControlButtons();
        this.app.addStatusMessage('Analysis stopped by user', 'warning');
        
        // Update remaining rows to pending
        if (this.app.uploadedData) {
            this.app.uploadedData.forEach(row => {
                if (row._status === ANALYSIS_STATUS.PROCESSING) {
                    row._status = ANALYSIS_STATUS.PENDING;
                    this.app.tableManager.updateRowInPlace(row);
                }
            });
        }
    }

    /**
     * Complete the analysis process
     */
    completeAnalysis() {
        this.isProcessing = false;
        this.isPaused = false;
        this.stopProgressMonitoring();
        
        const endTime = Date.now();
        const totalTime = Math.round((endTime - this.startTime) / 1000);
        const avgTime = this.processedRows > 0 ? Math.round(totalTime / this.processedRows) : 0;
        
        this.updateControlButtons();
        this.updateProgress(100);
        
        const message = `Analysis completed! ${this.successfulRows} successful, ${this.errorRows} errors in ${totalTime}s (avg: ${avgTime}s/URL)`;
        this.app.addStatusMessage(message, this.errorRows > 0 ? 'warning' : 'success');
        
        // Update table to show final results
        this.app.tableManager.renderTable();
    }

    /**
     * Start progress monitoring
     */
    startProgressMonitoring() {
        this.progressInterval = setInterval(() => {
            if (!this.isProcessing) return;
            
            const percentage = (this.processedRows / this.totalRows) * 100;
            this.updateProgress(percentage);
            
            // Update active request count
            const activeCount = this.activeRequests.size;
            const queueCount = this.processingQueue.length;
            
            const progressText = document.getElementById('progress-text');
            if (progressText) {
                let status = `${this.processedRows} / ${this.totalRows} completed`;
                if (activeCount > 0) {
                    status += ` (${activeCount} processing)`;
                }
                if (queueCount > 0) {
                    status += ` (${queueCount} pending)`;
                }
                progressText.textContent = status;
            }
            
        }, 500);
    }

    /**
     * Stop progress monitoring
     */
    stopProgressMonitoring() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    /**
     * Update progress bar and statistics
     */
    updateProgress(percentage) {
        const progressFill = document.getElementById('progress-fill');
        const progressStats = document.getElementById('progress-stats');
        
        if (progressFill) {
            progressFill.style.width = `${Math.min(percentage, 100)}%`;
        }
        
        if (progressStats) {
            progressStats.textContent = `${this.processedRows} / ${this.totalRows} completed`;
        }
        
        // Update detailed stats if available
        const successRate = this.processedRows > 0 ? 
            Math.round((this.successfulRows / this.processedRows) * 100) : 0;
        
        const statsText = `Success: ${this.successfulRows}, Errors: ${this.errorRows} (${successRate}% success rate)`;
        
        // You can add a stats element to show this information
        const statsElement = document.getElementById('analysis-stats');
        if (statsElement) {
            statsElement.textContent = statsText;
        }
    }

    /**
     * Update control button states
     */
    updateControlButtons() {
        const analyzeAllBtn = document.getElementById('analyze-all-btn');
        const analyzeSelectedBtn = document.getElementById('analyze-selected-btn');
        const pauseBtn = document.getElementById('pause-analysis-btn');
        const resumeBtn = document.getElementById('resume-analysis-btn');
        const stopBtn = document.getElementById('stop-analysis-btn');
        
        if (analyzeAllBtn) {
            analyzeAllBtn.disabled = this.isProcessing;
        }
        
        if (analyzeSelectedBtn) {
            analyzeSelectedBtn.disabled = this.isProcessing || this.app.selectedRows.size === 0;
        }
        
        if (pauseBtn) {
            pauseBtn.disabled = !this.isProcessing || this.isPaused;
            pauseBtn.style.display = this.isProcessing && !this.isPaused ? 'inline-flex' : 'none';
        }
        
        if (resumeBtn) {
            resumeBtn.disabled = !this.isProcessing || !this.isPaused;
            resumeBtn.style.display = this.isProcessing && this.isPaused ? 'inline-flex' : 'none';
        }
        
        if (stopBtn) {
            stopBtn.disabled = !this.isProcessing;
        }
    }

    /**
     * Reset progress and state
     */
    resetProgress() {
        this.isProcessing = false;
        this.isPaused = false;
        this.isStopped = false;
        this.currentIndex = 0;
        this.totalRows = 0;
        this.processedRows = 0;
        this.successfulRows = 0;
        this.errorRows = 0;
        this.startTime = null;
        
        this.stopProgressMonitoring();
        this.updateProgress(0);
        this.updateControlButtons();
        
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = 'Ready to analyze';
        }
    }

    /**
     * Get analysis statistics
     */
    getStats() {
        return {
            isProcessing: this.isProcessing,
            isPaused: this.isPaused,
            totalRows: this.totalRows,
            processedRows: this.processedRows,
            successfulRows: this.successfulRows,
            errorRows: this.errorRows,
            activeRequests: this.activeRequests.size,
            queueLength: this.processingQueue.length,
            successRate: this.processedRows > 0 ? 
                Math.round((this.successfulRows / this.processedRows) * 100) : 0
        };
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}