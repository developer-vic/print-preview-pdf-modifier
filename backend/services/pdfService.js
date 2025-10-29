const { PDFDocument, rgb } = require('pdf-lib');
const pdfjsLib = require('pdfjs-dist');

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.min.js');

class PDFService {
    constructor() {
        this.findText = '';
        this.replaceText = '';
    }

    /**
     * Extract text from PDF buffer using PDF.js
     * @param {Buffer} pdfBuffer - PDF file buffer
     * @param {string} findText - Text to find and replace
     * @param {string} replaceText - Text to replace with
     * @returns {Object} - Text extraction results with replacements
     */
    async extractTextWithPDFJS(pdfBuffer, findText, replaceText = '') {
        console.log('📝 Extracting text using PDF.js...');
        
        try {
            // Convert Buffer to Uint8Array for PDF.js
            const uint8Array = new Uint8Array(pdfBuffer);
            
            // Load PDF document
            const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
            let fullText = '';
            const replacements = [];
            
            console.log(`📄 Processing ${pdf.numPages} pages`);
            
            // Process each page
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1.0 });
                
                console.log(`📄 Processing page ${pageNum}/${pdf.numPages}`);
                
                textContent.items.forEach(item => {
                    if (item.str) {
                        fullText += item.str + ' ';
                        
                        // Check if this text item contains the find text
                        if (item.str.includes(findText)) {
                            const transform = item.transform;
                            const x = transform[4];
                            const y = transform[5];
                            let fontSize = Math.max(Math.abs(transform[0]), Math.abs(transform[3]));
                            
                            if (fontSize < 1) {
                                fontSize = item.height || 10;
                            }
                            
                            const newText = replaceText ? 
                                item.str.replace(new RegExp(this.escapeRegExp(findText), 'g'), replaceText) : 
                                item.str;
                            
                            replacements.push({
                                x: x,
                                y: y,
                                fontSize: fontSize,
                                fontName: item.fontName || 'Helvetica',
                                originalText: item.str,
                                newText: newText,
                                width: item.width,
                                height: item.height,
                                pageHeight: viewport.height,
                                pageNum: pageNum - 1
                            });
                        }
                    }
                });
            }
            
            console.log(`📄 Extracted text length: ${fullText.length}`);
            console.log(`🎯 Found ${replacements.length} text replacements`);
            
            return {
                fullText: fullText.trim(),
                replacements: replacements,
                pageCount: pdf.numPages,
                findText: findText,
                replaceText: replaceText
            };
            
        } catch (error) {
            console.error('❌ Error extracting text:', error);
            throw new Error(`Failed to extract text: ${error.message}`);
        }
    }

    /**
     * Extract text from PDF URL
     * @param {string} pdfUrl - URL of the PDF
     * @param {string} findText - Text to find and replace
     * @param {string} replaceText - Text to replace with
     * @returns {Object} - Text extraction results
     */
    async extractTextFromUrl(pdfUrl, findText, replaceText = '') {
        console.log('📥 Downloading PDF from URL:', pdfUrl);
        
        try {
            // Download PDF from URL
            const response = await fetch(pdfUrl);
            if (!response.ok) {
                throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
            }
            
            const pdfBuffer = await response.arrayBuffer();
            console.log('📄 PDF downloaded, size:', pdfBuffer.byteLength, 'bytes');
            
            // Extract text from the downloaded PDF
            return await this.extractTextWithPDFJS(Buffer.from(pdfBuffer), findText, replaceText);
            
        } catch (error) {
            console.error('❌ Error downloading PDF:', error);
            throw new Error(`Failed to download PDF: ${error.message}`);
        }
    }

    /**
     * Create modified PDF with text replacements
     * @param {Buffer} originalPdfBuffer - Original PDF buffer
     * @param {string} findText - Text to find and replace
     * @param {string} replaceText - Text to replace with
     * @returns {Buffer} - Modified PDF buffer
     */
    async createModifiedPDF(originalPdfBuffer, findText, replaceText) {
        console.log('🔧 Creating modified PDF using pdf-lib...');
        
        try {
            // First extract text to get replacement data
            const textData = await this.extractTextWithPDFJS(originalPdfBuffer, findText, replaceText);
            
            if (textData.replacements.length === 0) {
                console.log('⚠️ No text replacements found, returning original PDF');
                return originalPdfBuffer;
            }
            
            // Load the original PDF
            const pdfDoc = await PDFDocument.load(originalPdfBuffer);
            
            // Embed a standard font
            const helveticaFont = await pdfDoc.embedFont('Helvetica');
            
            // Group replacements by page
            const replacementsByPage = {};
            textData.replacements.forEach(replacement => {
                if (!replacementsByPage[replacement.pageNum]) {
                    replacementsByPage[replacement.pageNum] = [];
                }
                replacementsByPage[replacement.pageNum].push(replacement);
            });
            
            // Process each page with replacements
            for (const [pageNumStr, replacements] of Object.entries(replacementsByPage)) {
                const pageNum = parseInt(pageNumStr);
                const page = pdfDoc.getPage(pageNum);
                
                console.log(`📄 Processing page ${pageNum + 1} with ${replacements.length} replacements`);
                
                for (const replacement of replacements) {
                    // Calculate text dimensions
                    let textWidth = replacement.width;
                    if (!textWidth || textWidth < 1) {
                        textWidth = helveticaFont.widthOfTextAtSize(replacement.originalText, replacement.fontSize);
                    }
                    
                    let textHeight = replacement.height;
                    if (!textHeight || textHeight < 1) {
                        textHeight = replacement.fontSize * 1.2;
                    }
                    
                    // Draw a white rectangle to cover the old text
                    page.drawRectangle({
                        x: replacement.x + 0,
                        y: replacement.y + 0,
                        width: textWidth + 0,
                        height: textHeight + 0,
                        rotate: { type: 'degrees', angle: 90 }, // Rotate to match original
                        color: rgb(1, 1, 1), // White
                        opacity: 1,
                        borderColor: rgb(1, 1, 1),
                        borderWidth: 2,
                    });
                    
                    // Draw the new text
                    page.drawText(replacement.newText, {
                        x: replacement.x,
                        y: replacement.y,
                        size: replacement.fontSize,
                        font: helveticaFont,
                        rotate: { type: 'degrees', angle: 90 }, // Rotate to match original
                        color: rgb(0, 0, 0), // Black
                    });
                }
            }
            
            // Save the modified PDF
            const modifiedPdfBytes = await pdfDoc.save();
            console.log('✅ Modified PDF created, size:', modifiedPdfBytes.length, 'bytes');
            
            return Buffer.from(modifiedPdfBytes);
            
        } catch (error) {
            console.error('❌ Error creating modified PDF:', error);
            throw new Error(`Failed to create modified PDF: ${error.message}`);
        }
    }

    /**
     * Get basic PDF information
     * @param {Buffer} pdfBuffer - PDF file buffer
     * @returns {Object} - PDF information
     */
    async getPDFInfo(pdfBuffer) {
        try {
            // Convert Buffer to Uint8Array for PDF.js
            const uint8Array = new Uint8Array(pdfBuffer);
            const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
            
            // Get text from first page for preview
            const firstPage = await pdf.getPage(1);
            const textContent = await firstPage.getTextContent();
            const previewText = textContent.items
                .map(item => item.str)
                .join(' ')
                .substring(0, 200);
            
            return {
                pageCount: pdf.numPages,
                textPreview: previewText,
                hasText: previewText.length > 0
            };
            
        } catch (error) {
            console.error('❌ Error getting PDF info:', error);
            throw new Error(`Failed to get PDF info: ${error.message}`);
        }
    }

    /**
     * Escape special regex characters
     * @param {string} string - String to escape
     * @returns {string} - Escaped string
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

module.exports = new PDFService();
