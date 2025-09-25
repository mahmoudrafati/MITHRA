/**
 * MITHRA Energy Label Analyzer - Main Application
 * Entry point that coordinates all modules and handles user interactions
 */

import { FileHandler } from './fileHandler.js';
import { TableManager } from './tableManager.js';
import { AnalysisEngine } from './analysisEngine.js';
import { ApiClient } from './apiClient.js';
import { ANALYSIS_STATUS } from '../shared/constants.js';

/**
 * Main Application Class
 */
export class MithraApp {
    constructor() {
        console.log('🚀 MITHRA Energy Label Analyzer Starting...');
        
        // Application state
        this.uploadedData = null;
        this.filteredData = null;
        this.selectedRows = new Set();
        this.urlColumn = null;
        
        // Initialize core modules
        this.apiClient = new ApiClient();
        this.fileHandler = new FileHandler(this);
        this.tableManager = new TableManager(this);
        this.analysisEngine = new AnalysisEngine(this);
        
        // Setup application
        this.setupEventListeners();
        this.initializeUI();
        this.checkBackendConnection();
        
        this.addStatusMessage('Application initialized successfully', 'success');
    }

    /**
     * Setup global event listeners using event delegation
     */
    setupEventListeners() {
        // Global click handler with event delegation
        document.addEventListener('click', this.handleButtonClick.bind(this));
        
        // Global change handler for inputs
        document.addEventListener('change', this.handleInputChange.bind(this));
        
        // Setup file handler event listeners
        this.fileHandler.setupEventListeners();
        
        // File handler callbacks
        this.fileHandler.setOnDataProcessed(this.onDataProcessed.bind(this));
        this.fileHandler.setOnError(this.onFileError.bind(this));
        
        // Window events
        window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
    }

    /**
     * Handle button clicks with event delegation
     */
    handleButtonClick(event) {
        const button = event.target.closest('button[id]');
        if (!button) return;
        
        const buttonId = button.id;
        const handlers = {
            'select-file-btn': () => this.fileHandler.selectFile(),
            'toggle-upload-btn': () => this.fileHandler.toggleUploadSection(),
            'analyze-all-btn': () => this.analysisEngine.analyzeAll(),
            'analyze-selected-btn': () => this.analysisEngine.analyzeSelected(),
            'pause-analysis-btn': () => this.analysisEngine.pauseAnalysis(),
            'resume-analysis-btn': () => this.analysisEngine.resumeAnalysis(),
            'stop-analysis-btn': () => this.analysisEngine.stopAnalysis(),
            'export-csv-btn': () => this.tableManager.exportCSV(),
            'export-excel-btn': () => this.tableManager.exportExcel(),
            'clear-search-btn': () => this.clearSearch(),
            'select-all-visible-btn': () => this.tableManager.selectAllVisible(),
            'deselect-all-btn': () => this.tableManager.deselectAll(),
            'confirm-config': () => this.fileHandler.confirmConfig(),
            'cancel-config': () => this.fileHandler.closeColumnConfigDialog()
        };
        
        const handler = handlers[buttonId];
        if (handler) {
            event.preventDefault();
            try {
                handler();
            } catch (error) {
                console.error(`Error handling ${buttonId}:`, error);
                this.addStatusMessage(`Error: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Handle input changes
     */
    handleInputChange(event) {
        const input = event.target;
        
        if (input.matches('#search-input')) {
            this.tableManager.filterTable();
        } else if (input.matches('#status-filter')) {
            this.tableManager.filterTable();
        } else if (input.matches('#select-all-checkbox')) {
            this.handleSelectAllCheckbox(input.checked);
        } else if (input.matches('.row-checkbox')) {
            const rowId = input.dataset.rowId;
            this.tableManager.toggleRowSelection(rowId, input.checked);
        } else if (input.matches('#file-input')) {
            this.fileHandler.handleFileUpload(event);
        }
    }

    /**
     * Handle select all checkbox
     */
    handleSelectAllCheckbox(isChecked) {
        if (isChecked) {
            this.tableManager.selectAllVisible();
        } else {
            this.tableManager.deselectAll();
        }
    }

    /**
     * Initialize UI elements
     */
    initializeUI() {
        // Hide sections that should be hidden initially
        const controlsSection = document.querySelector('.controls-section');
        const tableSection = document.querySelector('.table-section');
        
        if (controlsSection) controlsSection.style.display = 'none';
        if (tableSection) tableSection.style.display = 'none';
        
        // Setup drop zone
        this.setupDropZone();
        
        // Initialize status container
        this.initializeStatusContainer();
    }

    /**
     * Setup drag and drop functionality
     */
    setupDropZone() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const selectFileBtn = document.getElementById('select-file-btn');
        
        if (!dropZone || !fileInput) {
            console.error('❌ Drop zone or file input not found in DOM');
            return;
        }
        
        console.log('✅ Setting up file upload handlers...');
        
        // Drag and drop events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
            console.log('🔄 Drag over detected');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            console.log('📥 Files dropped:', files.length);
            
            if (files.length > 0) {
                // Set files to file input to trigger normal processing
                Object.defineProperty(fileInput, 'files', {
                    value: files,
                    configurable: true
                });
                
                // Trigger change event
                const changeEvent = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(changeEvent);
            }
        });
        
        // File input change handler
        fileInput.addEventListener('change', (event) => {
            console.log('📂 File input changed, files:', event.target.files.length);
            if (event.target.files.length > 0) {
                this.fileHandler.handleFileUpload(event);
            }
        });
        
        // Button click to select file
        if (selectFileBtn) {
            selectFileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📁 Browse files button clicked');
                fileInput.click();
            });
        }
        
        // Click anywhere on drop zone to select file
        dropZone.addEventListener('click', (e) => {
            // Don't trigger if clicking on the button itself
            if (!e.target.closest('#select-file-btn')) {
                console.log('📁 Drop zone clicked');
                fileInput.click();
            }
        });
        
        console.log('✅ File upload handlers attached successfully');
    }

    /**
     * Initialize status message container
     */
    initializeStatusContainer() {
        let statusContainer = document.getElementById('status-container');
        if (!statusContainer) {
            statusContainer = document.createElement('div');
            statusContainer.id = 'status-container';
            statusContainer.className = 'status-container';
            
            const mainContent = document.querySelector('.main-content');
            if (mainContent && mainContent.firstChild) {
                mainContent.insertBefore(statusContainer, mainContent.firstChild);
            }
        }
    }

    /**
     * Check backend server connection
     */
    async checkBackendConnection() {
        try {
            const isConnected = await this.apiClient.isServerAvailable();
            
            if (isConnected) {
                this.addStatusMessage('Backend server connection established', 'success');
            } else {
                this.addStatusMessage('Backend server not available. Please start the server with: npm start', 'warning');
            }
        } catch (error) {
            this.addStatusMessage('Unable to connect to backend server', 'warning');
        }
    }

    /**
     * Callback when file data is processed
     */
    onDataProcessed(data) {
        console.log(`📊 Data processed: ${data.length} rows`);
        
        // Add unique IDs if not present
        data.forEach((row, index) => {
            if (!row._id) {
                row._id = index;
            }
            // Initialize analysis fields
            row._status = row._status || ANALYSIS_STATUS.PENDING;
            row._productFiche = row._productFiche || '';
            row._energyLabelPresent = row._energyLabelPresent || '';
            row._mouseoverLabel = row._mouseoverLabel || '';
            row._analysisResult = row._analysisResult || '';
            row._lastAnalyzed = row._lastAnalyzed || null;
        });
        
        this.uploadedData = data;
        this.filteredData = [...data];
        this.selectedRows.clear();
        
        // Show data in table
        this.tableManager.showData(data);
        
        this.addStatusMessage(`File processed successfully: ${data.length} URLs loaded`, 'success');
    }

    /**
     * Callback when file processing fails
     */
    onFileError(error) {
        console.error('File processing error:', error);
        this.addStatusMessage(`File processing failed: ${error.message}`, 'error');
    }

    /**
     * Clear search input
     */
    clearSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
            this.tableManager.filterTable();
        }
    }

    /**
     * Add status message to the UI
     */
    addStatusMessage(message, type = 'info') {
        const icon = this.getStatusIcon(type);
        
        // Map our types to Toastify styles
        const toastConfig = {
            text: `${icon} ${message}`,
            duration: type === 'error' ? 8000 : 4000, // Errors stay longer
            close: true,
            gravity: "top", // top or bottom
            position: "right", // left, center or right
            stopOnFocus: true, // Prevents dismissing of toast on hover
            className: `toast-${type}`,
            onClick: function(){} // Callback after click
        };
        
        // Add specific styling based on type
        switch (type) {
            case 'success':
                toastConfig.style = {
                    background: "linear-gradient(to right, #00b09b, #96c93d)",
                };
                break;
            case 'error':
                toastConfig.style = {
                    background: "linear-gradient(to right, #ff5f6d, #ffc371)",
                };
                break;
            case 'warning':
                toastConfig.style = {
                    background: "linear-gradient(to right, #f093fb, #f5576c)",
                };
                break;
            case 'info':
            default:
                toastConfig.style = {
                    background: "linear-gradient(to right, #4facfe, #00f2fe)",
                };
                break;
        }
        
        Toastify(toastConfig).showToast();
    }

    /**
     * Get icon for status message type
     */
    getStatusIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    /**
     * Show loading overlay
     */
    showLoadingOverlay(message = 'Processing...') {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            document.body.appendChild(overlay);
        }
        
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p id="loading-message">${message}</p>
            </div>
        `;
        
        overlay.style.display = 'flex';
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Reset entire application state
     */
    resetApplication() {
        if (!confirm('Reset all data? This will clear uploaded files and results.')) {
            return;
        }
        
        // Stop any ongoing analysis
        if (this.analysisEngine.isProcessing) {
            this.analysisEngine.stopAnalysis();
        }
        
        // Clear data
        this.uploadedData = null;
        this.filteredData = null;
        this.selectedRows.clear();
        this.urlColumn = null;
        
        // Reset modules
        this.fileHandler.reset();
        this.tableManager.clearTable();
        this.analysisEngine.resetProgress();
        
        // Clear search and filters
        const searchInput = document.getElementById('search-input');
        const statusFilter = document.getElementById('status-filter');
        
        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        
        this.addStatusMessage('Application reset successfully', 'success');
    }

    /**
     * Handle before window unload
     */
    onBeforeUnload(event) {
        if (this.analysisEngine && this.analysisEngine.isProcessing) {
            event.preventDefault();
            event.returnValue = 'Analysis is in progress. Are you sure you want to leave?';
            return event.returnValue;
        }
    }

    /**
     * Get application statistics
     */
    getAppStats() {
        return {
            uploadedRows: this.uploadedData ? this.uploadedData.length : 0,
            filteredRows: this.filteredData ? this.filteredData.length : 0,
            selectedRows: this.selectedRows.size,
            urlColumn: this.urlColumn,
            analysisStats: this.analysisEngine.getStats(),
            apiStats: this.apiClient.getConfig()
        };
    }

    /**
     * Export application configuration
     */
    exportConfig() {
        const config = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            stats: this.getAppStats()
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mithra-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.addStatusMessage('Configuration exported successfully', 'success');
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new MithraApp();
        console.log('✅ MITHRA application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize MITHRA application:', error);
        
        // Show error in a basic way if status system isn't available
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #fef2f2; color: #991b1b; padding: 1rem; border-radius: 8px;
            border: 1px solid #fecaca; z-index: 9999; max-width: 500px;
        `;
        errorDiv.innerHTML = `
            <strong>Application Error:</strong> ${error.message}
            <button onclick="this.parentElement.remove()" style="margin-left: 1rem;">×</button>
        `;
        document.body.appendChild(errorDiv);
    }
});