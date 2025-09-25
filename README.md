# MITHRA Energy Label Analyzer

A comprehensive web application for analyzing eBay product URLs to detect energy label compliance using headless browser scraping.

## 🎉 **Ready to Share with Friends!**
**Super simple - just download the folder and double-click `start-mithra-docker.bat`**

## 🎯 Overview

The MITHRA Energy Label Analyzer helps businesses ensure EU energy label compliance by automatically scanning eBay product listings and detecting:

- **Product Fiche (Produktdatenblatt)**: Links to energy information documents
- **Energy Label**: Visual energy efficiency ratings (A+++, A++, A+, A, B, C, D, E, F, G)
- **Mouseover Label**: Interactive energy label tooltips

## ✨ Features

- **Bulk Analysis**: Upload CSV/Excel files with hundreds of eBay URLs
- **Real-time Scraping**: Live analysis using Puppeteer headless browser
- **Smart Detection**: Advanced CSS selector patterns for energy label identification
- **Interactive Results**: Sortable, filterable table with export functionality
- **Rate Limiting**: Respects eBay's servers with intelligent request throttling
- **Error Handling**: Comprehensive error recovery and retry mechanisms

## 🏗️ Architecture

- **Frontend**: Vanilla JavaScript ES6 modules (no frameworks)
- **Backend**: Node.js + Express + Puppeteer
- **File Processing**: CSV/Excel parsing with column auto-detection
- **Scraping**: Headless Chrome automation with anti-detection measures

## 🚀 Quick Start

### Super Easy - For Everyone! 

**Just 1 steps:**
1. **Double-click** `start-mithra-docker.bat`

That's it! The app will:
- ✅ Check if Docker is installed (installs if needed)
- ✅ Build the application automatically  
- ✅ Start MITHRA at `http://localhost:3000`
- ✅ Open your browser automatically

### Alternative Methods

**For Developers:**
```bash
# Traditional Node.js way (requires Node.js installation)
npm install
npm start
```

**For Docker Users:**
```bash
# Manual Docker commands
docker-compose up
# OR
npm run docker:build
npm run docker:run
```

### System Requirements
- Windows 10/11, macOS 10.15+, or Linux
- 4GB RAM minimum  
- Internet connection (for Docker download if needed)
- No Node.js installation required! (Docker handles everything)

### Advanced Options

```bash
npm run dev           # Development mode (auto-restart)
npm run docker:auto   # PowerShell auto-installer
npm run security-check # Check for vulnerabilities
```

**Troubleshooting:**
- If batch file doesn't work → Run as Administrator
- If Docker issues → Install Docker Desktop from docker.com
- If still problems → Use `docker-compose up` manually

## 📊 Usage

### Step 1: Upload Data File
- Click "Upload File" or drag & drop
- Supports CSV, XLSX, XLS formats
- File size limit: 50MB

### Step 2: Configure Columns
- Select which column contains eBay URLs
- Preview your data before processing
- Auto-detection attempts to find URL columns

### Step 3: Run Analysis  
- Click "Analyze All" or select specific rows
- Monitor progress in real-time
- Pause/resume functionality available

### Step 4: Review Results
- Sort and filter results table
- Export data as CSV, Excel, or JSON
- View detailed error messages for failed analyses

## 🔧 Configuration

### CSS Selectors (shared/constants.js)

The application uses specific CSS selectors to detect energy labels:

```javascript
ENERGY_SELECTORS = {
    REGULATORY_WRAPPER: '.x-regulatory-wrapper',
    PRODUCT_FICHE: '.x-eek__product-link[href]',
    ENERGY_ICON: '.ux-eek-icon',
    MOUSEOVER_IMAGE: '.infotip__mask .ux-image img'
}
```

### Rate Limiting

- 30 requests per minute
- 2-second delay between requests  
- Automatic retry with exponential backoff
- Respects eBay's terms of service

### Browser Configuration

- Headless Chrome with optimized settings
- Random user agent rotation
- Resource blocking for faster performance
- Automatic memory management

## 📁 Project Structure

```
mithra-energy-analyzer/
├── index.html              # Main application page
├── style.css               # Application styles
├── package.json            # Node.js configuration
├── README.md               # This file
├── .gitignore              # Git ignore rules
│
├── frontend/               # Client-side modules
│   ├── app.js              # Main entry point
│   ├── fileHandler.js      # File upload & parsing
│   ├── tableManager.js     # Table rendering
│   ├── analysisEngine.js   # Analysis coordination
│   ├── apiClient.js        # Backend communication
│   └── utils.js            # Utility functions
│
├── backend/                # Server-side scraping
│   ├── server.js           # Express server
│   ├── scraperService.js   # Puppeteer automation
│   ├── energyParser.js     # HTML analysis
│   ├── rateLimiter.js      # Request throttling
│   └── config.js           # Server configuration
│
├── shared/                 # Common constants
│   ├── constants.js        # CSS selectors & config
│   └── validators.js       # Data validation
│
└── tests/                  # Test files
    └── [test files]
```

## 🧪 Testing

### Run Tests
```bash
npm test                # Run all tests
npm run test:watch     # Watch mode for development
```

### Test Coverage
- Unit tests for all core modules
- Integration tests for scraping workflow
- Mock eBay responses for reliable testing

## 📈 Performance

### Optimizations Applied
- **DocumentFragment** rendering for large tables
- **Resource blocking** in Puppeteer (images, CSS, fonts)
- **Connection pooling** for concurrent requests
- **Memory management** with automatic cleanup

### Performance Targets
- Process 100+ URLs without memory leaks
- Table rendering < 100ms for 1000 rows  
- Scraping rate: 1-2 URLs per second
- Browser memory usage < 500MB

## 🛠️ API Reference

### POST /api/analyze-ebay
Analyze a single eBay URL for energy labels.

**Request:**
```json
{
  "url": "https://www.ebay.com/itm/123456789"
}
```

**Response:**
```json
{
  "productFiche": "Y",
  "energyLabel": "Y", 
  "mouseoverLabel": "N",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/health
Health check endpoint for monitoring.

## 🐛 Troubleshooting

### Common Issues

**Script won't run:**
- Right-click `start-mithra-docker.bat` → "Run as Administrator"
- Make sure you have internet connection

**Docker not working:**
- Install Docker Desktop from https://docker.com
- Restart computer after Docker installation
- Make sure Docker Desktop is running

**Can't access http://localhost:3000:**
- Wait 30-60 seconds after starting
- Check if port 3000 is already in use
- Try `docker-compose logs` to see error messages

**Still having problems:**
- Use manual method: `docker-compose up`
- Check the `QUICK-START.md` file for step-by-step help
- Contact support with error messages

## 🔒 Security & Compliance

- **No personal data storage** - URLs only
- **Respects robots.txt** and rate limits
- **User-Agent rotation** to avoid detection
- **HTTPS only** for secure communication
- **Input validation** prevents injection attacks

## 🚧 Development

### Adding New Features

1. **Frontend modules**: Add to `frontend/` directory
2. **Backend services**: Add to `backend/` directory  
3. **Shared code**: Add to `shared/` directory
4. **Update constants**: Modify `shared/constants.js`

### Code Style
- ES6 modules with import/export
- Async/await for asynchronous operations
- Comprehensive error handling
- JSDoc comments for documentation

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check troubleshooting section above
- Review the documentation

---

**Built with ❤️ for energy compliance automation**