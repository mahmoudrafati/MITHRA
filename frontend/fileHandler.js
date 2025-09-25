/**
 * MITHRA Energy Label Analyzer - File Handler
 * Handles file uploads, CSV/Excel parsing, and column configuration
 */

import { 
    FILE_CONSTANTS, 
    ERROR_MESSAGES, 
    REGEX_PATTERNS, 
    VALIDATION_RULES 
} from '../shared/constants.js';

/**
 * FileHandler class manages file upload, parsing, and data preprocessing
 */
export class FileHandler {
    constructor(app = null) {
        this.app = app; // Reference to main app for callbacks
        this.uploadedData = null;
        this.originalData = null;
        this.urlColumn = null;
        this.titleColumn = null;
        this.csvDelimiter = FILE_CONSTANTS.DEFAULT_DELIMITER;
        this.fileInput = null;
        this.columnConfigDialog = null;
        this.onDataProcessed = null; // Callback when data is ready
        this.onError = null; // Error callback
        
        console.log('📁 FileHandler initialized');
        this.initializeElements();
    }

    /**
     * Initialize DOM elements and create file input
     */
    initializeElements() {
        // Find or create file input element
        this.fileInput = document.getElementById('file-input');
        if (!this.fileInput) {
            this.fileInput = document.createElement('input');
            this.fileInput.type = 'file';
            this.fileInput.id = 'file-input';
            this.fileInput.accept = FILE_CONSTANTS.SUPPORTED_FORMATS.join(',');
            this.fileInput.style.display = 'none';
            document.body.appendChild(this.fileInput);
        }
    }

    /**
     * Set up event listeners for file handling
     */
    setupEventListeners() {
        this.fileInput.addEventListener('change', (event) => {
            this.handleFileUpload(event);
        });

        // Handle drag and drop functionality
        this.setupDragAndDrop();
        
        // Handle upload section toggle
        this.setupUploadToggle();
    }

    /**
     * Set up drag and drop functionality for file uploads
     */
    setupDragAndDrop() {
        const dropZone = document.getElementById('drop-zone') || document.body;
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });
    }

    /**
     * Set up upload section toggle functionality
     */
    setupUploadToggle() {
        const toggleBtn = document.getElementById('toggle-upload-btn');
        const uploadContent = document.getElementById('upload-content');
        
        if (toggleBtn && uploadContent) {
            toggleBtn.addEventListener('click', () => {
                this.toggleUploadSection();
            });
        }
    }

    /**
     * Toggle the upload section collapse/expand
     */
    toggleUploadSection() {
        const toggleBtn = document.getElementById('toggle-upload-btn');
        const uploadContent = document.getElementById('upload-content');
        const toggleIcon = toggleBtn.querySelector('.toggle-icon');
        
        if (uploadContent.classList.contains('collapsed')) {
            // Expand
            uploadContent.classList.remove('collapsed');
            toggleBtn.classList.remove('collapsed');
            toggleIcon.textContent = '▼';
        } else {
            // Collapse
            uploadContent.classList.add('collapsed');
            toggleBtn.classList.add('collapsed');
            toggleIcon.textContent = '▶';
        }
    }

    /**
     * Show the upload toggle button after successful upload
     */
    showUploadToggle() {
        const toggleBtn = document.getElementById('toggle-upload-btn');
        if (toggleBtn) {
            toggleBtn.style.display = 'inline-flex';
        }
    }

    /**
     * Trigger file selection dialog
     */
    selectFile() {
        this.fileInput.click();
    }

    /**
     * Handle file upload event
     */
    async handleFileUpload(event) {
        console.log('📂 Processing file upload...');
        const files = event.target.files;
        
        if (!files || files.length === 0) {
            console.log('❌ No files selected');
            return;
        }
        
        if (this.app) {
            this.app.addStatusMessage(`Processing ${files.length} file(s)...`, 'info');
        }
        
        try {
            for (let file of files) {
                console.log('📄 Processing file:', file.name);
                await this.processFile(file);
            }
        } catch (error) {
            console.error('❌ File processing error:', error);
            if (this.app) {
                this.app.addStatusMessage(`Error processing files: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Process uploaded file
     */
    async processFile(file) {
        try {
            // Validate file
            this.validateFile(file);

            // Show loading indicator
            this.showLoadingIndicator('Processing file...');

            // Determine file type and parse accordingly
            const fileExtension = this.getFileExtension(file.name);
            let data = null;

            switch (fileExtension) {
                case '.csv':
                    data = await this.parseCSV(file);
                    break;
                case '.xlsx':
                case '.xls':
                    data = await this.parseExcel(file);
                    break;
                default:
                    throw new Error(ERROR_MESSAGES.UNSUPPORTED_FORMAT);
            }

            this.originalData = data;
            this.showColumnConfiguration(data);

        } catch (error) {
            this.handleError(error);
        } finally {
            this.hideLoadingIndicator();
        }
    }

    /**
     * Validate uploaded file
     */
    validateFile(file) {
        // Check file size
        if (file.size > FILE_CONSTANTS.MAX_FILE_SIZE) {
            throw new Error(ERROR_MESSAGES.FILE_TOO_LARGE);
        }

        // Check file format
        const extension = this.getFileExtension(file.name);
        if (!FILE_CONSTANTS.SUPPORTED_FORMATS.includes(extension)) {
            throw new Error(ERROR_MESSAGES.UNSUPPORTED_FORMAT);
        }
    }

    /**
     * Get file extension from filename
     */
    getFileExtension(filename) {
        return filename.toLowerCase().substr(filename.lastIndexOf('.'));
    }

    /**
     * Parse CSV file
     */
    async parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    
                    // Detect delimiter
                    this.csvDelimiter = this.detectCSVDelimiter(text);
                    
                    // Parse CSV using Papa Parse (if available) or custom parser
                    let data;
                    if (typeof Papa !== 'undefined') {
                        const result = Papa.parse(text, {
                            delimiter: this.csvDelimiter,
                            header: true,
                            skipEmptyLines: true,
                            transformHeader: (header) => header.trim(),
                            transform: (value) => value.trim()
                        });
                        
                        if (result.errors.length > 0) {
                            console.warn('CSV parsing warnings:', result.errors);
                        }
                        
                        data = result.data;
                    } else {
                        // Fallback to custom CSV parser
                        data = this.customCSVParse(text);
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(new Error(ERROR_MESSAGES.PARSE_ERROR + ': ' + error.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error(ERROR_MESSAGES.PARSE_ERROR));
            };
            
            reader.readAsText(file, FILE_CONSTANTS.ENCODING);
        });
    }

    /**
     * Parse Excel file
     */
    async parseExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    // This would require XLSX library to be loaded
                    if (typeof XLSX === 'undefined') {
                        reject(new Error('XLSX library not loaded. Please include the XLSX library for Excel support.'));
                        return;
                    }
                    
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get first worksheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        header: 1,
                        defval: ''
                    });
                    
                    // Transform to objects with headers
                    if (jsonData.length === 0) {
                        throw new Error('Empty Excel file');
                    }
                    
                    const headers = jsonData[0].map(h => String(h).trim());
                    const rows = jsonData.slice(1).map(row => {
                        const obj = {};
                        headers.forEach((header, index) => {
                            obj[header] = row[index] ? String(row[index]).trim() : '';
                        });
                        return obj;
                    });
                    
                    resolve(rows);
                } catch (error) {
                    reject(new Error(ERROR_MESSAGES.PARSE_ERROR + ': ' + error.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error(ERROR_MESSAGES.PARSE_ERROR));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Detect CSV delimiter
     */
    detectCSVDelimiter(text) {
        const delimiters = FILE_CONSTANTS.CSV_DELIMITERS;
        const sample = text.split('\n').slice(0, 5).join('\n'); // First 5 lines
        
        let bestDelimiter = FILE_CONSTANTS.DEFAULT_DELIMITER;
        let maxCount = 0;
        
        for (const delimiter of delimiters) {
            const count = (sample.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                bestDelimiter = delimiter;
            }
        }
        
        return bestDelimiter;
    }

    /**
     * Custom CSV parser (fallback when Papa Parse is not available)
     */
    customCSVParse(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) return [];
        
        const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].trim() : '';
            });
            
            data.push(row);
        }
        
        return data;
    }

    /**
     * Parse a single CSV line
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"' && !inQuotes) {
                inQuotes = true;
            } else if (char === '"' && inQuotes) {
                if (nextChar === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = false;
                }
            } else if (char === this.csvDelimiter && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    /**
     * Show column configuration dialog
     */
    showColumnConfiguration(data) {
        if (!data || data.length === 0) {
            throw new Error(ERROR_MESSAGES.NO_URLS_FOUND);
        }
        
        const headers = Object.keys(data[0]);
        this.createColumnConfigDialog(headers, data);
    }

    /**
     * Create column configuration dialog
     */
    createColumnConfigDialog(headers, data) {
        // Remove existing dialog if present
        if (this.columnConfigDialog) {
            this.columnConfigDialog.remove();
        }
        
        // Create dialog HTML
        this.columnConfigDialog = document.createElement('div');
        this.columnConfigDialog.className = 'column-config-dialog';
        this.columnConfigDialog.innerHTML = `
            <div class="dialog-overlay">
                <div class="dialog-content">
                    <h3>Configure Columns</h3>
                    <p>Please select the column containing eBay URLs:</p>
                    
                    <div class="column-selection">
                        <label for="url-column-select">URL Column:</label>
                        <select id="url-column-select" required>
                            <option value="">-- Select URL Column --</option>
                            ${headers.map(header => 
                                `<option value="${header}">${header}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="column-selection">
                        <label for="title-column-select">Title Column (optional):</label>
                        <select id="title-column-select">
                            <option value="">-- No Title Column --</option>
                            ${headers.map(header => 
                                `<option value="${header}">${header}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="data-preview">
                        <h4>Data Preview (first 5 rows):</h4>
                        <div class="preview-table">
                            ${this.createPreviewTable(data.slice(0, 5), headers)}
                        </div>
                    </div>
                    
                    <div class="file-info">
                        <p><strong>Total rows:</strong> ${data.length}</p>
                        <p><strong>Columns found:</strong> ${headers.length}</p>
                    </div>
                    
                    <div class="dialog-actions">
                        <button type="button" id="cancel-config" class="btn btn-secondary">Cancel</button>
                        <button type="button" id="confirm-config" class="btn btn-primary">Process Data</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.columnConfigDialog);
        
        // Setup dialog event listeners
        this.setupColumnConfigEvents(data);
    }

    /**
     * Create preview table HTML
     */
    createPreviewTable(data, headers) {
        if (data.length === 0) return '<p>No data to preview</p>';
        
        let html = '<table class="preview-table"><thead><tr>';
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        data.forEach(row => {
            html += '<tr>';
            headers.forEach(header => {
                const value = row[header] || '';
                const truncated = value.length > 50 ? value.substr(0, 47) + '...' : value;
                html += `<td title="${value}">${truncated}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    }

    /**
     * Setup column configuration dialog events
     */
    setupColumnConfigEvents(data) {
        const urlSelect = this.columnConfigDialog.querySelector('#url-column-select');
        const titleSelect = this.columnConfigDialog.querySelector('#title-column-select');
        const cancelBtn = this.columnConfigDialog.querySelector('#cancel-config');
        const confirmBtn = this.columnConfigDialog.querySelector('#confirm-config');
        
        // Auto-detect URL column
        const headers = Object.keys(data[0]);
        const urlHeader = this.detectUrlColumn(headers, data);
        if (urlHeader) {
            urlSelect.value = urlHeader;
        }
        
        // Auto-detect title column
        const titleHeader = this.detectTitleColumn(headers, data);
        if (titleHeader) {
            titleSelect.value = titleHeader;
        }
        
        cancelBtn.addEventListener('click', () => {
            this.closeColumnConfigDialog();
        });
        
        confirmBtn.addEventListener('click', () => {
            const selectedUrlColumn = urlSelect.value;
            const selectedTitleColumn = titleSelect.value;
            
            if (!selectedUrlColumn) {
                alert('Please select a URL column');
                return;
            }
            
            this.urlColumn = selectedUrlColumn;
            this.titleColumn = selectedTitleColumn || null; // Optional
            this.processData(data);
            this.closeColumnConfigDialog();
        });
    }

    /**
     * Auto-detect URL column based on content
     */
    detectUrlColumn(headers, data) {
        // Look for column names that suggest URLs
        const urlKeywords = ['url', 'link', 'ebay', 'product', 'item'];
        
        for (const header of headers) {
            const lowerHeader = header.toLowerCase();
            if (urlKeywords.some(keyword => lowerHeader.includes(keyword))) {
                return header;
            }
        }
        
        // Check actual data for URL patterns
        for (const header of headers) {
            const sampleValues = data.slice(0, 10).map(row => row[header]);
            const urlCount = sampleValues.filter(value => 
                value && REGEX_PATTERNS.EBAY_URL.test(value)
            ).length;
            
            if (urlCount > 0) {
                return header;
            }
        }
        
        return null;
    }

    /**
     * Auto-detect title column based on header names
     */
    detectTitleColumn(headers, data) {
        // Look for column names that suggest titles
        const titleKeywords = ['title', 'name', 'product', 'description', 'artikel', 'produkt', 'bezeichnung'];
        
        for (const header of headers) {
            const lowerHeader = header.toLowerCase();
            if (titleKeywords.some(keyword => lowerHeader.includes(keyword))) {
                // Make sure it's not the URL column
                if (!this.detectUrlColumn([header], data)) {
                    return header;
                }
            }
        }
        
        return null;
    }

    /**
     * Process and validate data
     */
    processData(rawData) {
        try {
            if (!this.urlColumn) {
                throw new Error('No URL column selected');
            }
            
            // Filter and validate URLs
            const processedData = rawData
                .map((row, index) => ({
                    ...row,
                    originalIndex: index,
                    url: row[this.urlColumn]?.trim() || '',
                    title: this.titleColumn ? (row[this.titleColumn]?.trim() || 'No Title') : 'No Title'
                }))
                .filter(row => row.url && this.validateUrl(row.url))
                .map(row => ({
                    ...row,
                    status: 'Pending',
                    productFiche: '',
                    energyLabel: '',
                    mouseoverLabel: '',
                    errorMessage: '',
                    lastAnalyzed: null
                }));
            
            if (processedData.length === 0) {
                throw new Error(ERROR_MESSAGES.NO_URLS_FOUND);
            }
            
            this.uploadedData = processedData;
            
            // Notify that data is ready
            if (this.onDataProcessed) {
                this.onDataProcessed(processedData);
            }
            
            // Show the collapse/expand toggle button after successful upload
            this.showUploadToggle();
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Validate URL format
     */
    validateUrl(url) {
        if (!url || url.length < VALIDATION_RULES.MIN_URL_LENGTH) {
            return false;
        }
        
        if (url.length > VALIDATION_RULES.MAX_URL_LENGTH) {
            return false;
        }
        
        return REGEX_PATTERNS.EBAY_URL.test(url);
    }

    /**
     * Close column configuration dialog
     */
    closeColumnConfigDialog() {
        if (this.columnConfigDialog) {
            this.columnConfigDialog.remove();
            this.columnConfigDialog = null;
        }
    }

    /**
     * Confirm column configuration (public method for app.js)
     */
    confirmConfig() {
        if (!this.columnConfigDialog) return;
        
        const urlSelect = this.columnConfigDialog.querySelector('#url-column-select');
        if (!urlSelect) return;
        
        const selectedColumn = urlSelect.value;
        if (!selectedColumn) {
            alert('Please select a URL column');
            return;
        }
        
        this.urlColumn = selectedColumn;
        this.processData(this.originalData);
        this.closeColumnConfigDialog();
    }

    /**
     * Show loading indicator
     */
    showLoadingIndicator(message = 'Processing...') {
        console.log('Loading:', message);
        if (this.app && this.app.showLoadingOverlay) {
            this.app.showLoadingOverlay(message);
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoadingIndicator() {
        console.log('Loading complete');
        if (this.app && this.app.hideLoadingOverlay) {
            this.app.hideLoadingOverlay();
        }
    }

    /**
     * Handle errors
     */
    handleError(error) {
        console.error('FileHandler error:', error);
        if (this.onError) {
            this.onError(error);
        }
    }

    /**
     * Get processed data
     */
    getData() {
        return this.uploadedData;
    }

    /**
     * Reset file handler state
     */
    reset() {
        this.uploadedData = null;
        this.originalData = null;
        this.urlColumn = null;
        this.csvDelimiter = FILE_CONSTANTS.DEFAULT_DELIMITER;
        
        if (this.fileInput) {
            this.fileInput.value = '';
        }
        
        this.closeColumnConfigDialog();
    }

    /**
     * Set callback for when data is processed
     */
    setOnDataProcessed(callback) {
        this.onDataProcessed = callback;
    }

    /**
     * Set error callback
     */
    setOnError(callback) {
        this.onError = callback;
    }
}