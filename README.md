# Print Preview PDF Modifier v2.0

A full-stack PDF modification tool that intercepts PDF files online and automatically modifies text portions based on configuration settings. The tool consists of a backend API for PDF processing and a frontend automation system that monitors web traffic and intercepts PDF downloads.

## 📋 Overview

This tool automatically intercepts PDF files when they are accessed online, extracts text content, identifies target text portions based on your configuration, and replaces them with your specified text. The modified PDF is then automatically printed or displayed. This is particularly useful for automating PDF modifications without manual intervention.

## ✨ Key Features

### 🌐 PDF Interception
- **Automatic Detection**: Intercepts PDF files from various online sources
- **URL Format Support**: Handles various URL formats and edge cases
- **Real-time Processing**: Modifies PDFs as they are downloaded
- **Multiple Source Support**: Works with different PDF hosting services

### 🖨️ Unified Auto-Print Behavior
- **Consistent Experience**: All PDFs automatically trigger print dialog after modification
- **Simplified Logic**: Streamlined processing pipeline
- **Better Reliability**: No dependency on finding specific print buttons
- **Faster Execution**: Optimized delays and retry logic

### 🔧 PDF Processing
- **Enhanced Error Handling**: Better logging and debugging capabilities
- **Robust URL Processing**: Handles various URL formats and edge cases
- **Better Timing**: Optimized delays and retry logic
- **Comprehensive Logging**: Detailed console output for troubleshooting

## 🚀 Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd print-preview-pdf-modifier
   cp .env.example .env
   ```

2. **Edit `.env`** with your configuration (credentials, URLs, text replacement settings)

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

### Configure Environment Variables

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your actual configuration values:
   ```bash
   # User Credentials
   EMAIL=your-email@example.com
   PASSWORD=your-password

   # URLs
   LOGIN_URL=https://example.com/login
   MAIN_URL=https://example.com/
   SHIPMENT_URL=https://example.com/shipment

   # Text Replacement Settings
   FIND_TEXT=text-to-find
   REPLACE_TEXT=text-to-replace

   # Backend Service Configuration
   BACKEND_URL=http://localhost:3000
   PORT=3000
   ```

3. **Important**: Never commit the `.env` file to version control. It contains sensitive credentials.

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
├── backend/           # Express.js API server
├── frontend/          # Node.js automation scripts
├── scripts/           # Launcher and utility scripts
└── package.json       # Combined dependencies and scripts
```

## 🎯 How It Works

1. **PDF Interception**: The frontend automation monitors browser network traffic and intercepts PDF file requests
2. **Text Extraction**: When a PDF is detected, it's downloaded and sent to the backend API for text extraction
3. **Text Matching**: The backend searches for configured text patterns within the PDF
4. **PDF Modification**: If matches are found, the PDF is modified with the replacement text
5. **Auto-Print**: The modified PDF is automatically displayed and triggers the print dialog

## 🔧 Configuration

### Environment Variables

All sensitive configuration is stored in the `.env` file (which is excluded from version control). Start by copying the example file:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values:

- `EMAIL` - Login email address
- `PASSWORD` - Login password
- `LOGIN_URL` - Login page URL
- `MAIN_URL` - Main application URL
- `SHIPMENT_URL` - Specific page URL (if needed)
- `FIND_TEXT` - Text pattern to find in PDFs
- `REPLACE_TEXT` - Text to replace with
- `BACKEND_URL` - Backend API URL (default: http://localhost:3000)
- `PORT` - Backend server port (default: 3000)

### Text Replacement Settings

Configure text replacement in your `.env` file:

```bash
FIND_TEXT=Original Text
REPLACE_TEXT=Modified Text
```

### Backend URL
Default backend runs on `http://localhost:3000`. Modify in `.env` if needed.

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
4. **Text Not Found**: Verify text replacement configuration in `.env` file
5. **Environment Variables Not Loading**: Ensure `.env` file exists and is properly formatted

### Debug Mode

Enable detailed logging by checking console output. The system provides comprehensive logging for:
- PDF request interception
- Download progress
- Text extraction results
- PDF modification process
- Print dialog triggering

## Security Notes

- **Never commit `.env` file**: The `.env` file contains sensitive credentials and is excluded from version control via `.gitignore`
- **Keep credentials secure**: Store your `.env` file securely and never share it publicly
- **Use environment-specific configs**: Consider using different `.env` files for development and production

## Development

The project uses `concurrently` to run both services simultaneously during development, and a custom launcher script for production deployment.

## 📝 Changelog

### v2.0.0
- ✨ Added automatic PDF interception and modification
- ✨ Unified auto-print behavior for all PDF types
- ✨ Enhanced error handling and logging
- ✨ Improved URL processing with various format support
- 🔧 Simplified print button detection logic
- 🐛 Fixed PDF viewer replacement timing issues
- 🔒 Moved sensitive data to environment variables
