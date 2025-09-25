/**
 * MITHRA Energy Label Analyzer - Table Manager
 * Handles table rendering, sorting, filtering, and export functionality
 */

import { TABLE_COLUMNS, ANALYSIS_STATUS } from '../shared/constants.js';

export class TableManager {
    constructor(app) {
        this.app = app;
        this.currentSort = { column: null, direction: 'asc' };
        this.currentFilter = { search: '', status: '' };
        
        // DOM elements
        this.controlsSection = document.querySelector('.controls-section');
        this.tableSection = document.querySelector('.table-section');
        this.tableBody = document.getElementById('table-body');
        this.searchInput = document.getElementById('search-input');
        this.statusFilter = document.getElementById('status-filter');
        this.visibleRowsSpan = document.getElementById('visible-rows');
        this.totalRowsSpan = document.getElementById('total-rows');
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for table interactions
     */
    setupEventListeners() {
        // Search functionality
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.debounce(() => {
                this.filterTable();
            }, 300));
        }
        
        // Status filter
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', () => {
                this.filterTable();
            });
        }
        
        // Clear search button
        const clearSearchBtn = document.getElementById('clear-search-btn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.searchInput.value = '';
                this.filterTable();
            });
        }
        
        // Export buttons
        const exportCsvBtn = document.getElementById('export-csv-btn');
        const exportExcelBtn = document.getElementById('export-excel-btn');
        
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportCSV());
        }
        
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => this.exportExcel());
        }
        
        // Table selection buttons
        const selectAllVisibleBtn = document.getElementById('select-all-visible-btn');
        const deselectAllBtn = document.getElementById('deselect-all-btn');
        
        if (selectAllVisibleBtn) {
            selectAllVisibleBtn.addEventListener('click', () => this.selectAllVisible());
        }
        
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => this.deselectAll());
        }
        
        // Table header click events for sorting
        this.setupTableSorting();
    }

    /**
     * Setup table header sorting
     */
    setupTableSorting() {
        const table = document.getElementById('results-table');
        if (!table) return;
        
        table.addEventListener('click', (event) => {
            const header = event.target.closest('th.sortable');
            if (!header) return;
            
            const column = header.dataset.column;
            if (column) {
                this.sortTable(column);
            }
        });
    }

    /**
     * Display the uploaded data in the table
     */
    showData(data) {
        if (!data || data.length === 0) {
            this.showNoData();
            return;
        }
        
        this.app.uploadedData = data;
        this.app.filteredData = [...data];
        
        // Show table sections
        this.controlsSection.style.display = 'block';
        this.tableSection.style.display = 'block';
        
        this.renderTable();
        this.updateRowCounts();
        
        this.app.addStatusMessage(`Data loaded: ${data.length} rows ready for analysis`, 'success');
    }

    /**
     * Render the complete table
     */
    renderTable() {
        if (!this.app.filteredData || this.app.filteredData.length === 0) {
            this.showNoData();
            return;
        }
        
        // Use DocumentFragment for efficient rendering
        const fragment = document.createDocumentFragment();
        
        this.app.filteredData.forEach((row, index) => {
            const tr = this.createRowElement(row, index);
            fragment.appendChild(tr);
        });
        
        // Clear and append new content
        this.tableBody.innerHTML = '';
        this.tableBody.appendChild(fragment);
        
        this.updateRowCounts();
        this.updateSelectAllCheckbox();
    }

    /**
     * Create a single table row element
     */
    createRowElement(row, index) {
        const tr = document.createElement('tr');
        tr.dataset.rowId = row._id || index;
        tr.className = row._status ? `status-${row._status.toLowerCase()}` : '';
        
        // Add selection state
        if (this.app.selectedRows.has(row._id || index)) {
            tr.classList.add('selected');
        }
        
        // Checkbox cell
        const checkboxCell = document.createElement('td');
        checkboxCell.innerHTML = `
            <input type="checkbox" 
                   class="row-checkbox" 
                   data-row-id="${row._id || index}"
                   ${this.app.selectedRows.has(row._id || index) ? 'checked' : ''}>
        `;
        tr.appendChild(checkboxCell);
        
        // URL cell
        const urlCell = document.createElement('td');
        urlCell.className = 'url-cell';
        urlCell.title = row.url || row[this.app.urlColumn] || '';
        
        const url = row.url || row[this.app.urlColumn] || '';
        const truncatedUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
        
        urlCell.innerHTML = `<a href="${url}" target="_blank" rel="noopener">${truncatedUrl}</a>`;
        tr.appendChild(urlCell);
        
        // Title cell
        const titleCell = document.createElement('td');
        titleCell.className = 'title-cell';
        const title = row.title || 'No Title';
        const truncatedTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
        titleCell.title = title; // Full title on hover
        titleCell.textContent = truncatedTitle;
        tr.appendChild(titleCell);
        
        // Analysis result cells
        const productFicheCell = document.createElement('td');
        productFicheCell.className = `compliance-cell ${this.getComplianceClass(row._productFiche)}`;
        productFicheCell.textContent = row._productFiche || '-';
        tr.appendChild(productFicheCell);
        
        const energyLabelCell = document.createElement('td');
        energyLabelCell.className = `compliance-cell ${this.getComplianceClass(row._energyLabelPresent)}`;
        energyLabelCell.textContent = row._energyLabelPresent || '-';
        tr.appendChild(energyLabelCell);
        
        const mouseoverLabelCell = document.createElement('td');
        mouseoverLabelCell.className = `compliance-cell ${this.getComplianceClass(row._mouseoverLabel)}`;
        mouseoverLabelCell.textContent = row._mouseoverLabel || '-';
        tr.appendChild(mouseoverLabelCell);
        
        // Status cell
        const statusCell = document.createElement('td');
        statusCell.className = 'status-cell';
        const status = row._status || 'Pending';
        statusCell.innerHTML = `<span class="status-badge status-${status.toLowerCase()}">${status}</span>`;
        tr.appendChild(statusCell);
        
        // Last analyzed cell
        const lastAnalyzedCell = document.createElement('td');
        lastAnalyzedCell.className = 'timestamp-cell';
        const timestamp = row._lastAnalyzed ? new Date(row._lastAnalyzed).toLocaleString() : '-';
        lastAnalyzedCell.textContent = timestamp;
        tr.appendChild(lastAnalyzedCell);
        
        // Row click handler for selection
        checkboxCell.addEventListener('change', (e) => {
            this.toggleRowSelection(row._id || index, e.target.checked);
        });
        
        return tr;
    }

    /**
     * Get CSS class for compliance values
     */
    getComplianceClass(value) {
        switch (value) {
            case 'Y': return 'compliance-yes';
            case 'N': return 'compliance-no';
            case 'ERROR': case 'Error': return 'compliance-error';
            default: return '';
        }
    }

    /**
     * Update a single row in place
     */
    updateRowInPlace(row) {
        const rowElement = document.querySelector(`tr[data-row-id="${row._id}"]`);
        if (!rowElement) return;
        
        // Update status
        const statusCell = rowElement.querySelector('.status-cell');
        if (statusCell) {
            const status = row._status || 'Pending';
            statusCell.innerHTML = `<span class="status-badge status-${status.toLowerCase()}">${status}</span>`;
        }
        
        // Update compliance cells
        const cells = rowElement.querySelectorAll('.compliance-cell');
        if (cells.length >= 3) {
            cells[0].textContent = row._productFiche || '-';
            cells[0].className = `compliance-cell ${this.getComplianceClass(row._productFiche)}`;
            
            cells[1].textContent = row._energyLabelPresent || '-';
            cells[1].className = `compliance-cell ${this.getComplianceClass(row._energyLabelPresent)}`;
            
            cells[2].textContent = row._mouseoverLabel || '-';
            cells[2].className = `compliance-cell ${this.getComplianceClass(row._mouseoverLabel)}`;
        }
        
        // Update timestamp
        const timestampCell = rowElement.querySelector('.timestamp-cell');
        if (timestampCell) {
            timestampCell.textContent = row._lastAnalyzed ? 
                new Date(row._lastAnalyzed).toLocaleString() : '-';
        }
        
        // Update row class
        rowElement.className = row._status ? `status-${row._status.toLowerCase()}` : '';
        if (this.app.selectedRows.has(row._id)) {
            rowElement.classList.add('selected');
        }
    }

    /**
     * Filter table based on search and status
     */
    filterTable() {
        if (!this.app.uploadedData) return;
        
        const searchTerm = this.searchInput?.value.toLowerCase() || '';
        const statusFilter = this.statusFilter?.value || '';
        
        this.app.filteredData = this.app.uploadedData.filter(row => {
            const url = (row.url || row[this.app.urlColumn] || '').toLowerCase();
            const status = row._status || 'Pending';
            
            const matchesSearch = !searchTerm || url.includes(searchTerm);
            const matchesStatus = !statusFilter || status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
        
        this.renderTable();
    }

    /**
     * Sort table by column
     */
    sortTable(column) {
        if (!this.app.filteredData) return;
        
        // Toggle direction if same column
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }
        
        // Sort data
        this.app.filteredData.sort((a, b) => {
            let aValue = this.getSortValue(a, column);
            let bValue = this.getSortValue(b, column);
            
            // Handle different data types
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            let result = 0;
            if (aValue < bValue) result = -1;
            else if (aValue > bValue) result = 1;
            
            return this.currentSort.direction === 'desc' ? -result : result;
        });
        
        this.renderTable();
        this.updateSortIndicators();
    }

    /**
     * Get sortable value from row
     */
    getSortValue(row, column) {
        switch (column) {
            case 'url':
                return row.url || row[this.app.urlColumn] || '';
            case 'productFiche':
                return row._productFiche || 'ZZ'; // Sort empty values last
            case 'energyLabel':
                return row._energyLabelPresent || 'ZZ';
            case 'mouseoverLabel':
                return row._mouseoverLabel || 'ZZ';
            case 'status':
                return row._status || 'Pending';
            case 'lastAnalyzed':
                return row._lastAnalyzed ? new Date(row._lastAnalyzed) : new Date(0);
            default:
                return '';
        }
    }

    /**
     * Update sort indicators in headers
     */
    updateSortIndicators() {
        // Clear all indicators
        const indicators = document.querySelectorAll('.sort-indicator');
        indicators.forEach(indicator => {
            indicator.className = 'sort-indicator';
        });
        
        // Set current sort indicator
        if (this.currentSort.column) {
            const header = document.querySelector(`th[data-column="${this.currentSort.column}"] .sort-indicator`);
            if (header) {
                header.className = `sort-indicator ${this.currentSort.direction}`;
            }
        }
    }

    /**
     * Toggle row selection
     */
    toggleRowSelection(rowId, isSelected) {
        if (isSelected) {
            this.app.selectedRows.add(rowId);
        } else {
            this.app.selectedRows.delete(rowId);
        }
        
        this.updateSelectionUI();
    }

    /**
     * Select all visible rows
     */
    selectAllVisible() {
        if (!this.app.filteredData) return;
        
        this.app.filteredData.forEach((row, index) => {
            this.app.selectedRows.add(row._id || index);
        });
        
        this.updateSelectionUI();
        this.renderTable();
    }

    /**
     * Deselect all rows
     */
    deselectAll() {
        this.app.selectedRows.clear();
        this.updateSelectionUI();
        this.renderTable();
    }

    /**
     * Update selection-related UI elements
     */
    updateSelectionUI() {
        const selectedCount = this.app.selectedRows.size;
        
        // Update selected count display
        const selectedCountSpan = document.getElementById('selected-count');
        if (selectedCountSpan) {
            selectedCountSpan.textContent = selectedCount;
        }
        
        // Enable/disable analyze selected button
        const analyzeSelectedBtn = document.getElementById('analyze-selected-btn');
        if (analyzeSelectedBtn) {
            analyzeSelectedBtn.disabled = selectedCount === 0;
        }
        
        this.updateSelectAllCheckbox();
    }

    /**
     * Update select all checkbox state
     */
    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (!selectAllCheckbox || !this.app.filteredData) return;
        
        const totalVisible = this.app.filteredData.length;
        const selectedVisible = this.app.filteredData.filter((row, index) => 
            this.app.selectedRows.has(row._id || index)
        ).length;
        
        if (selectedVisible === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedVisible === totalVisible) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    /**
     * Update row count displays
     */
    updateRowCounts() {
        if (this.visibleRowsSpan) {
            this.visibleRowsSpan.textContent = this.app.filteredData ? this.app.filteredData.length : 0;
        }
        if (this.totalRowsSpan) {
            this.totalRowsSpan.textContent = this.app.uploadedData ? this.app.uploadedData.length : 0;
        }
    }

    /**
     * Export data as CSV
     */
    exportCSV() {
        if (!this.app.uploadedData || this.app.uploadedData.length === 0) {
            this.app.addStatusMessage('No data to export', 'error');
            return;
        }
        
        const headers = this.getExportHeaders();
        const rows = this.app.uploadedData.map(row => this.getExportRow(row));
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        
        this.downloadFile(csvContent, 'mithra-analysis-results.csv', 'text/csv');
    }

    /**
     * Export data as Excel (JSON for now, can be enhanced)
     */
    exportExcel() {
        this.app.addStatusMessage('Excel export not yet implemented. Using CSV format.', 'info');
        this.exportCSV();
    }

    /**
     * Get export headers
     */
    getExportHeaders() {
        return [
            'URL',
            'Product Fiche (Y/N)',
            'Energy Label (Y/N)', 
            'Mouseover Label (Y/N)',
            'Status',
            'Last Analyzed',
            'Analysis Result'
        ];
    }

    /**
     * Get export row data
     */
    getExportRow(row) {
        return [
            row.url || row[this.app.urlColumn] || '',
            row._productFiche || '',
            row._energyLabelPresent || '',
            row._mouseoverLabel || '',
            row._status || 'Pending',
            row._lastAnalyzed ? new Date(row._lastAnalyzed).toLocaleString() : '',
            row._analysisResult || ''
        ];
    }

    /**
     * Download file utility
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.app.addStatusMessage(`Export completed: ${filename}`, 'success');
    }

    /**
     * Show no data message
     */
    showNoData() {
        this.tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">
                    No data available. Upload a CSV or Excel file to begin analysis.
                </td>
            </tr>
        `;
        this.updateRowCounts();
    }

    /**
     * Clear table
     */
    clearTable() {
        this.tableBody.innerHTML = '';
        this.app.filteredData = null;
        this.app.selectedRows.clear();
        this.updateRowCounts();
        this.updateSelectionUI();
        
        // Hide sections
        this.controlsSection.style.display = 'none';
        this.tableSection.style.display = 'none';
    }

    /**
     * Debounce utility function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}