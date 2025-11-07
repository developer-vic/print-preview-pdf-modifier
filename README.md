# Print Preview PDF Modifier v3.0

A full-stack PDF modification tool that intercepts PDF files online and automatically modifies text portions based on configuration settings. The tool consists of a backend API for PDF processing and a frontend automation system that monitors web traffic and intercepts PDF downloads. Version 3.0 includes advanced shipment automation features for integrating Shopify and Packlink systems.

## 📋 Overview

This tool automatically intercepts PDF files when they are accessed online, extracts text content, identifies target text portions based on your configuration, and replaces them with your specified text. The modified PDF is then automatically printed or displayed. Additionally, version 3.0 includes a shipment automation system that synchronizes order information between Shopify and Packlink platforms. This is particularly useful for automating PDF modifications and order processing without manual intervention.

## ✨ Key Features

### 🌐 PDF Interception
- **Automatic Detection**: Intercepts PDF files from various online sources
- **URL Format Support**: Handles various URL formats and edge cases
- **Real-time Processing**: Modifies PDFs as they are downloaded
- **Multiple Source Support**: Works with different PDF hosting services
- **Auto-Print Integration**: Automatically prints modified PDFs for shipment labels

### 🤖 Shipment Automation (v3.0)
- **Multi-Platform Integration**: Automatically synchronizes orders between Shopify and Packlink
- **One-Click Processing**: Interactive button on Shopify order pages for on-demand automation
- **Smart Login Management**: Automatic login with cookie persistence for both platforms
- **Iframe Support**: Handles Shopify app iframes seamlessly
- **Tracking Synchronization**: Auto-extracts tracking numbers and updates Shopify orders
- **Carrier Management**: Automatically sets carrier to LaPoste in Shopify
- **Tab Management**: Opens multiple tabs in the same browser window
- **Event-Driven**: Button appears automatically when viewing order details
- **Direct Shipment Deep-Linking**: Jumps straight to the Packlink shipment detail view without manual filtering

### 🖨️ Unified Auto-Print Behavior
- **Consistent Experience**: All PDFs automatically trigger print dialog after modification
- **Simplified Logic**: Streamlined processing pipeline
- **Better Reliability**: No dependency on finding specific print buttons
- **Faster Execution**: Optimized delays and retry logic
- **Cross-Platform Key Press**: Uses AppleScript on macOS and PowerShell on Windows to confirm the print dialog

### 🔧 PDF Processing
- **Enhanced Error Handling**: Better logging and debugging capabilities
- **Robust URL Processing**: Handles various URL formats and edge cases
- **Better Timing**: Optimized delays and retry logic
- **Comprehensive Logging**: Detailed console output for troubleshooting

### 🖥️ Browser Management (v3.0)
- **Maximized Window**: Browser starts maximized for optimal screen usage
- **Persistent Context**: Uses persistent browser context for better tab management
- **Multi-Tab Support**: All tabs open in the same browser window instance
- **Cookie Persistence**: Separate cookie management for different platforms
- **Action Timeouts**: Fast 5-second timeouts for responsive automation

## 🚀 Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd print-preview-pdf-modifier
   ```

2. **Configure**:
   ```bash
   cp frontend/config.js.example frontend/config.js
   ```
   Then edit `frontend/config.js` with your credentials and settings

3. **Install and run**:
   ```bash
   npm install
   npm start
   ```

## 🚀 One-Command Setup

### For macOS/Linux Users
```bash
./setup.sh
```

### For Windows Users
```batch
setup.bat
```

The setup script will automatically:
- ✅ Check system requirements (Node.js 16+)
- ✅ Install all dependencies
- ✅ Install Playwright browsers
- ✅ Create necessary directories
- ✅ Start both backend and frontend services

### Setup Script Options

```bash
# Full setup and start (default)
./setup.sh

# Skip dependency installation (if already installed)
./setup.sh --skip-install

# Skip Playwright browser installation
./setup.sh --skip-playwright

# Only check system requirements
./setup.sh --check-only

# Show help
./setup.sh --help
```

## Manual Setup (Alternative)

### Install Dependencies
```bash
npm install
```

### Development Mode (Both Services)
```bash
npm run dev
```

### Production Mode (Both Services)
```bash
npm start
```

### Individual Services

#### Backend Only
```bash
npm run backend
# or for development with auto-restart
npm run backend:dev
```

#### Frontend Only
```bash
npm run frontend
# or for development with auto-restart
npm run frontend:dev
```

## Available Scripts

- `npm start` - Start both backend and frontend services
- `npm run dev` - Start both services in development mode with auto-restart
- `npm run backend` - Start only the backend service
- `npm run frontend` - Start only the frontend service
- `npm run backend:dev` - Start backend in development mode
- `npm run frontend:dev` - Start frontend in development mode
- `npm run install:all` - Install dependencies for all services
- `npm run clean` - Remove all node_modules directories

## Project Structure

```
├── backend/                    # Express.js API server
├── frontend/                   # Node.js automation scripts
│   ├── index.js                # Main automation script
│   ├── config.js               # Configuration file (create from config.js.example)
│   ├── config.js.example       # Example configuration template
│   ├── cookies.json            # Packlink cookies (auto-generated)
│   └── shopify-cookies.json    # Shopify cookies (auto-generated)
├── browser-data/               # Persistent browser context (auto-generated)
├── scripts/                    # Launcher and utility scripts
└── package.json                # Combined dependencies and scripts
```

## 🎯 How It Works

### PDF Interception Flow
1. **PDF Interception**: The frontend automation monitors browser network traffic and intercepts PDF file requests
2. **Text Extraction**: When a PDF is detected, it's downloaded and sent to the backend API for text extraction
3. **Text Matching**: The backend searches for configured text patterns within the PDF
4. **PDF Modification**: If matches are found, the PDF is modified with the replacement text
5. **Auto-Print**: The modified PDF is automatically displayed and triggers the print dialog

### Shipment Automation Flow
1. **Initialization**: After Packlink login, system logs into Shopify with cookie persistence
2. **Shopify Setup**: A "Process with Packlink" button appears on order detail pages
3. **On-Demand Processing**: When button is clicked on an order page:
   - Extracts shipment ID from order page header
   - Opens Packlink tab and navigates directly to the shipment via deep link
   - Extracts tracking number from carrier section
   - Triggers print of shipping label
   - Returns to Shopify order page and fills tracking number + sets carrier to LaPoste
4. **Completion**: All tabs remain open for verification; ready for next order

## 🔧 Configuration

### Main Configuration File

All configuration is stored in `frontend/config.js`. This file contains:

```javascript
{
  // Browser settings
  browser: {
    headless: false,
    args: ['--start-maximized', '--disable-web-security', '--disable-features=VizDisplayCompositor']
  },
  
  // Packlink credentials
  credentials: {
    email: 'your-packlink-email@example.com',
    password: 'your-packlink-password'
  },
  
  // URLs
  urls: {
    login: 'https://auth.packlink.com/fr-FR/pro/login?tenant_id=PACKLINKPROFR',
    main: 'https://pro.packlink.fr/private/shipments/ready-for-shipping'
  },
  
  // Text replacement settings
  textReplacement: {
    find: 'text-to-find',
    replace: 'text-to-replace'
  },
  
  // Backend service
  backendUrl: 'http://localhost:3000',
  
  // Shopify integration
  shopify: {
    email: 'your-shopify-email@example.com',
    password: 'your-shopify-password',
    loginUrl: 'https://accounts.shopify.com/lookup',
    loginUrl2: 'https://accounts.shopify.com/login',
    homeUrl: 'https://admin.shopify.com/store/YOUR-STORE-NAME/apps/YOUR-APP-NAME',
    cookiePath: 'shopify-cookies.json'
  }
}
```

### Shipment Automation Setup

1. **Create config file**: Copy the example config and edit with your credentials:
   ```bash
   cp frontend/config.js.example frontend/config.js
   # Edit frontend/config.js with your credentials
   ```

2. **Configure Shopify store URL**: Update the `shopify.homeUrl` in `config.js` with your actual Shopify store name and app name.

3. **Run automation**: Start the app and navigate to Shopify order pages. Click the "Process with Packlink" button when ready to process an order.

### Using the Shipment Automation

1. **Start the application**: Run `npm start` or `./setup.sh`
2. **Login**: System automatically logs into both Packlink and Shopify
3. **Navigate**: Go to any Shopify order detail page (URL containing `/orders/`)
4. **Process**: Click the blue "Process with Packlink" button that appears in the top-right
5. **Result**: System automatically:
   - Opens Packlink, finds the shipment, and prints the label
   - Returns to Shopify and fills in the tracking number
   - Sets carrier to LaPoste
   - Keeps tabs open for verification


## 📊 API Endpoints

### Backend API (`http://localhost:3000`)

- `POST /api/extract-text` - Extract text from uploaded PDF
- `POST /api/extract-text-url` - Extract text from PDF URL
- `POST /api/modify-pdf` - Create modified PDF with text replacements
- `GET /api/health` - Health check endpoint

## Dependencies

This project combines dependencies from both backend and frontend:

### Backend Dependencies
- Express.js for API server
- PDF.js for PDF processing
- PDF-lib for PDF manipulation
- Security and middleware packages

### Frontend Dependencies
- Playwright for browser automation
- Form-data for HTTP requests
- File system utilities

## 🐛 Troubleshooting

### Common Issues

1. **PDF Not Loading**: Check console logs for detailed error messages
2. **API Errors**: Verify URL format and network connectivity
3. **Print Dialog Not Appearing**: Check browser permissions and popup blockers
4. **Text Not Found**: Verify text replacement configuration in `frontend/config.js`
5. **Configuration Not Loading**: Ensure `frontend/config.js` is properly formatted
6. **Button Not Appearing**: Make sure you're on a Shopify order detail page (URL contains `/orders/`)
7. **Button Click Not Working**: Wait for page to fully load (button appears 3-5 seconds after page load)
8. **Login Issues**: Check credentials in `config.js` and delete `cookies.json` and `shopify-cookies.json` to force fresh login

### Debug Mode

Enable detailed logging by checking console output. The system provides comprehensive logging for:
- PDF request interception
- Download progress
- Text extraction results
- PDF modification process
- Print dialog triggering
- Shipment automation progress
- Button setup and triggers
- Iframe navigation and element detection

## Security Notes

- **Never commit credentials**: The `config.js` file contains sensitive credentials and should be added to `.gitignore`
- **Keep credentials secure**: Store your credentials securely and never share them publicly
- **Cookie files**: Cookie files (`cookies.json` and `shopify-cookies.json`) are automatically created and excluded from git
- **Browser data**: The `browser-data/` directory is excluded from version control

## Development

The project uses `concurrently` to run both services simultaneously during development, and a custom launcher script for production deployment.

## 📝 Changelog

### v3.0.0 (Current)
- ✨ Added shipment automation system integrating Shopify and Packlink
- ✨ Interactive button-based processing on Shopify order pages
- ✨ Smart login management with cookie persistence for both platforms
- ✨ Iframe support for Shopify app integration
- ✨ Automatic tracking number extraction and synchronization
- ✨ Carrier management (LaPoste) automation
- ✨ Maximized browser window for optimal screen usage
- ✨ Persistent browser context for better tab management
- ✨ Multi-tab support in same browser window
- ✨ Fast 5-second action timeouts for responsive automation
- 🐛 Fixed execution context issues with iframe navigation
- 🔧 Improved PDF interception with page-specific routing
- 🔧 Enhanced error handling and logging
- 🔧 Removed batch file processing in favor of on-demand button triggers

### v2.0.0
- ✨ Added automatic PDF interception and modification
- ✨ Unified auto-print behavior for all PDF types
- ✨ Enhanced error handling and logging
- ✨ Improved URL processing with various format support
- 🔧 Simplified print button detection logic
- 🐛 Fixed PDF viewer replacement timing issues
- 🔒 Moved sensitive data to environment variables
