const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const pdfService = require('./services/pdfService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'PDF Text Extraction Backend'
    });
});

// Extract text from PDF
app.post('/api/extract-text', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No PDF file provided' 
            });
        }

        const { findText, replaceText } = req.body;
        
        if (!findText) {
            return res.status(400).json({ 
                error: 'findText parameter is required' 
            });
        }

        const result = await pdfService.extractTextWithPDFJS(
            req.file.buffer,
            findText,
            replaceText || ''
        );

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error extracting text:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Extract text from PDF URL
app.post('/api/extract-text-url', async (req, res) => {
    try {
        const { pdfUrl, findText, replaceText } = req.body;
        
        if (!pdfUrl || !findText) {
            return res.status(400).json({ 
                error: 'pdfUrl and findText parameters are required' 
            });
        }

        const result = await pdfService.extractTextFromUrl(
            pdfUrl,
            findText,
            replaceText || ''
        );

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error extracting text from URL:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create modified PDF
app.post('/api/modify-pdf', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No PDF file provided' 
            });
        }

        const { findText, replaceText } = req.body;
        
        if (!findText || !replaceText) {
            return res.status(400).json({ 
                error: 'findText and replaceText parameters are required' 
            });
        }

        const result = await pdfService.createModifiedPDF(
            req.file.buffer,
            findText,
            replaceText
        );

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="modified.pdf"');
        res.send(result);

    } catch (error) {
        console.error('Error modifying PDF:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get PDF info (page count, text preview, etc.)
app.post('/api/pdf-info', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No PDF file provided' 
            });
        }

        const info = await pdfService.getPDFInfo(req.file.buffer);

        res.json({
            success: true,
            data: info
        });

    } catch (error) {
        console.error('Error getting PDF info:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 50MB.'
            });
        }
    }
    
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 PDF Text Extraction Backend running on port ${PORT}`);
    console.log(`📄 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
});

module.exports = app;

