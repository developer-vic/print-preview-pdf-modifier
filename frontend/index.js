const { chromium } = require('playwright');
const fs = require('fs-extra');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const config = require('./config');

class ContinuousPDFModifier {
    constructor() {
        this.browser = null;
        this.page = null;
        this.credentials = config.credentials;
        this.findText = config.textReplacement.find;
        this.replaceText = config.textReplacement.replace;
        this.backendUrl = config.backendUrl || 'http://localhost:3000';
    }

    async init() {
        console.log('🚀 Initializing Continuous PDF Modifier...');

        try {
            this.browser = await chromium.launch({
                headless: false,
                args: [
                    '--start-maximized',
                    '--window-size=1920,1080',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            });
        } catch (error) {
            console.error('❌ Failed to launch browser:', error.message);
            throw error;
        }

        this.page = await this.browser.newPage();
        //get width from screen
        await this.page.setViewportSize({ width: 1500, height: 800 });

        // Intercept PDF requests
        this.page.route('**/*', async (route) => {
            const url = route.request().url();

            // Check if this is a PDF request
            if (url.includes('.pdf') && (url.includes('storage.googleapis.com') || url.includes('api.eu.shipengine.com'))) {
                console.log('🎯 PDF REQUEST INTERCEPTED:', url);

                if (url.includes('api.eu.shipengine.com')) {
                    // Continue with shipengine requests
                    await route.continue();
                } else {
                    // Abort other requests
                    await route.abort();
                }

                // Download and modify the PDF
                this.downloadAndModifyPDF(url, url.includes('api.eu.shipengine.com'));

            } else {
                // Continue with other requests
                await route.continue();
            }
        });

        console.log('✅ PDF interception enabled');
    }

    async downloadAndModifyPDF(pdfUrl, isShipEngine = false) {
        console.log('📥 Downloading PDF for modification...');

        try {
            // Download the PDF
            const response = await fetch(pdfUrl);
            const pdfBuffer = await response.arrayBuffer();

            console.log('📄 PDF downloaded, size:', pdfBuffer.byteLength, 'bytes');

            // Use PDF.js to extract text and coordinates
            const textData = await this.extractTextWithPDFJS(Buffer.from(pdfBuffer));

            if (textData.replacements.length > 0) {
                console.log(`🎯 FOUND ${textData.replacements.length} INSTANCES OF TARGET TEXT!`);

                // Create modified PDF using pdf-lib
                const modifiedPdf = await this.createModifiedPDF(Buffer.from(pdfBuffer), textData);

                // Replace the PDF in the browser
                console.log('🔍 About to call replacePDFInBrowser with isShipEngine:', isShipEngine);
                await this.replacePDFInBrowser(modifiedPdf, isShipEngine);
                console.log('🔍 replacePDFInBrowser completed');

                console.log('✅ PDF modified and replaced in browser');

            } else {
                console.log('⚠️ Target text not found in PDF');
                console.log('📄 PDF text preview:', textData.fullText.substring(0, 200));
            }

        } catch (error) {
            console.error('❌ Error processing PDF:', error.message);
        }
    }

    async extractTextWithPDFJS(pdfBuffer) {
        console.log('📝 Extracting text using backend service...');

        try {
            // Create form data for the API request
            const formData = new FormData();
            formData.append('pdf', pdfBuffer, { filename: 'document.pdf' });
            formData.append('findText', this.findText);
            formData.append('replaceText', this.replaceText);

            // Make API request to backend service
            const response = await fetch(`${this.backendUrl}/api/extract-text`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Backend service error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(`Backend service error: ${result.error}`);
            }

            console.log(`📄 Extracted text length: ${result.data.fullText.length}`);
            console.log(`🎯 Found ${result.data.replacements.length} text replacements`);

            return result.data;

        } catch (error) {
            console.error('❌ Backend service error:', error.message);
            throw error;
        }
    }


    async createModifiedPDF(originalPdfBuffer, textData) {
        console.log('🔧 Creating modified PDF using backend service...');

        try {
            // Create form data for the API request
            const formData = new FormData();
            formData.append('pdf', originalPdfBuffer, { filename: 'document.pdf' });
            formData.append('findText', this.findText);
            formData.append('replaceText', this.replaceText);

            // Make API request to backend service
            const response = await fetch(`${this.backendUrl}/api/modify-pdf`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Backend service error: ${response.status} ${response.statusText}`);
            }

            const modifiedPdfBuffer = await response.buffer();
            console.log('✅ Modified PDF created by backend, size:', modifiedPdfBuffer.length, 'bytes');

            return modifiedPdfBuffer;

        } catch (error) {
            console.error('❌ Backend service error:', error.message);
            throw error;
        }
    }


    async replacePDFInBrowser(modifiedPdf, isShipEngine = false) {
            console.log('🔄 Auto-printing modified PDF...');

        try {
            const base64Pdf = modifiedPdf.toString('base64');

            // Create hidden iframe and handle print behavior
            console.log('🔍 About to call page.evaluate with isShipEngine:', isShipEngine);
            console.log('🔍 PDF base64 length:', base64Pdf.length);
            
            await this.page.evaluate(({ pdfBase64, isShipEngine }) => {
                console.log('🔍 Inside page.evaluate - starting execution');
                console.log('🔍 isShipEngine value:', isShipEngine);
                console.log('🔍 pdfBase64 length:', pdfBase64.length);
                
                try {
                    console.log('🔍 Starting base64 conversion...');
                    // Convert base64 to binary data
                    const binaryString = atob(pdfBase64);
                    console.log('🔍 Binary string length:', binaryString.length);
                    
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    console.log('🔍 Bytes array created, length:', bytes.length);

                    console.log('🔍 Creating blob...');
                    // Create blob and URL
                    const blob = new Blob([bytes], { type: 'application/pdf' });
                    const blobUrl = URL.createObjectURL(blob);
                    console.log('🔍 Blob created, URL:', blobUrl);

                    console.log('🔍 Creating iframe...');
                    // Create hidden iframe
                    const pdfFrame = document.createElement('iframe');
                    pdfFrame.src = blobUrl;
                    pdfFrame.style.cssText = `
                        position: absolute;
                        left: -9999px;
                        top: -9999px;
                        width: 1px;
                        height: 1px;
                        visibility: hidden;
                        opacity: 0;
                        border: none;
                    `;
                    console.log('🔍 Iframe created, adding to page...');

                    // Add to page (hidden)
                    document.body.appendChild(pdfFrame);
                    console.log('🔍 Iframe added to page');

                    // Auto-print when PDF loads (same behavior for all PDFs)
                    console.log('🔍 Setting up auto-print for PDF');
                    pdfFrame.onload = () => {
                        console.log('🔍 PDF iframe loaded, setting up auto-print...');
                        setTimeout(() => {
                            try {
                                // Focus the iframe and trigger print
                                pdfFrame.contentWindow.focus();
                                pdfFrame.contentWindow.print();
                                console.log('✅ Print dialog triggered for modified PDF');

                                // Keep the iframe in the page - do not remove it
                                console.log('📄 PDF iframe kept in page for future use');

                            } catch (printError) {
                                console.error('Print error:', printError);
                                // Only clean up on error, not on success
                                if (document.body.contains(pdfFrame)) {
                                    document.body.removeChild(pdfFrame);
                                }
                                URL.revokeObjectURL(blobUrl);
                            }
                        }, 1000);
                    };

                    console.log('✅ Hidden PDF iframe created');

                } catch (error) {
                    console.error('❌ Error creating hidden PDF iframe:', error.message);
                }
            }, { pdfBase64: base64Pdf, isShipEngine });
            
            console.log('🔍 page.evaluate completed successfully');

            console.log('✅ Modified PDF auto-print triggered');

        } catch (error) {
            console.error('❌ Error preparing PDF:', error.message);
        }
    }

    async loadCookies() {
        try {
            if (await fs.pathExists('cookies.json')) {
                console.log('🍪 Loading saved cookies...');
                const cookies = await fs.readJson('cookies.json');
                await this.page.context().addCookies(cookies);
                console.log('✅ Cookies loaded successfully');
                return true;
            } else {
                console.log('🍪 No saved cookies found');
                return false;
            }
        } catch (error) {
            console.log('⚠️ Error loading cookies:', error.message);
            return false;
        }
    }

    async saveCookies() {
        try {
            console.log('🍪 Saving cookies...');
            const cookies = await this.page.context().cookies();
            await fs.writeJson('cookies.json', cookies, { spaces: 2 });
            console.log('✅ Cookies saved successfully');
        } catch (error) {
            console.log('⚠️ Error saving cookies:', error.message);
        }
    }

    async login() {
        console.log('🔐 Attempting login...');

        try {
            await this.page.goto(config.urls.login);
            await this.page.waitForSelector('input[type="email"]');

            await this.page.fill('input[type="email"]', this.credentials.email);
            await this.page.fill('input[type="password"]', this.credentials.password);
            await this.page.click('button[type="submit"]');

            await this.page.waitForLoadState('networkidle', { timeout: 60000 });
            console.log('✅ Login successful');

            await this.saveCookies();
            return true;

        } catch (error) {
            console.error('❌ Login failed:', error.message);
            return false;
        }
    }

    async start() {
        try {
            await this.init();

            // Try cookies first
            const cookiesLoaded = await this.loadCookies();
            if (!cookiesLoaded) {
                console.log('🍪 No cookies found, attempting login...');
                const loginSuccess = await this.login();
                if (!loginSuccess) {
                    console.error('❌ Login failed, exiting...');
                    return;
                }
            } else {
                console.log('🍪 Using saved cookies...');
                // Test if cookies still work
                await this.page.goto('https://pro.packlink.fr');
                const currentUrl = this.page.url();
                if (currentUrl.includes('login') || currentUrl.includes('auth')) {
                    console.log('🍪 Cookies expired, attempting fresh login...');
                    const loginSuccess = await this.login();
                    if (!loginSuccess) {
                        console.error('❌ Login failed, exiting...');
                        return;
                    }
                } else {
                    console.log('✅ Cookies still valid, proceeding...');
                }
            }

            // Start continuous monitoring (no specific navigation needed)
            console.log('📦 Starting continuous PDF monitoring...');
        } catch (error) {
            console.error('❌ PDF monitoring failed:', error.message);
            console.error('Full error:', error);
            // Keep browser open for debugging
            console.log('🔍 Browser kept open for debugging. Close manually when done.');
        }
    }
}

// Run continuous PDF monitoring
async function main() {
    const modifier = new ContinuousPDFModifier();
    await modifier.start();
}

main().catch(console.error);