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
        this.cookiePath = config.cookiePath || 'cookies.json';
        this.functionExposed = false;
    }

    async init() {
        console.log('🚀 Initializing Continuous PDF Modifier...');

        try {
            const path = require('path');
            const browserDataDir = path.join(__dirname, '..', 'browser-data');

            // Get screen size
            const screenInfo = await this.getScreenSize();
            console.log(`📺 Screen size: ${screenInfo.width}x${screenInfo.height}`);

            this.browser = await chromium.launchPersistentContext(browserDataDir, {
                headless: config.browser.headless,
                args: config.browser.args,
                viewport: { width: screenInfo.width, height: screenInfo.height },
                actionTimeout: 5000  // 5 second timeout for clicks and actions
            });

            // Get or create the first page
            if (this.browser.pages().length > 0) {
                this.page = this.browser.pages()[0];
            } else {
                this.page = await this.browser.newPage();
            }
        } catch (error) {
            console.error('❌ Failed to launch browser:', error.message);
            throw error;
        }
    }

    async getScreenSize() {
        // Use a temporary browser to get screen size
        const tempBrowser = await chromium.launch({ headless: true });
        const tempPage = await tempBrowser.newPage();
        const dimensions = await tempPage.evaluate(() => ({
            width: window.screen.width,
            height: window.screen.height
        }));
        await tempBrowser.close();
        return dimensions;
    }

    async initPageInterceptor(sentPage) {
        sentPage.route('**/*', async (route) => {
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
                this.downloadAndModifyPDF(url, sentPage, url.includes('api.eu.shipengine.com'));
            } else {
                // Continue with other requests
                await route.continue();
            }
        });
    }

    async downloadAndModifyPDF(pdfUrl, sentPage, isShipEngine = false) {
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
                await this.replacePDFInBrowser(modifiedPdf, sentPage, isShipEngine);
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


    async replacePDFInBrowser(modifiedPdf, sentPage, isShipEngine = false) {
        console.log('🔄 Auto-printing modified PDF...');

        try {
            const base64Pdf = modifiedPdf.toString('base64');

            // Create hidden iframe and handle print behavior
            console.log('🔍 About to call page.evaluate with isShipEngine:', isShipEngine);
            console.log('🔍 PDF base64 length:', base64Pdf.length);

            await sentPage.evaluate(({ pdfBase64, isShipEngine }) => {
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
                        }, config.waitTime);
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
            if (await fs.pathExists(this.cookiePath)) {
                console.log('🍪 Loading saved cookies...');
                const cookies = await fs.readJson(this.cookiePath);
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
            await fs.writeJson(this.cookiePath, cookies, { spaces: 2 });
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

            //wait for 5 seconds
            await new Promise(resolve => setTimeout(resolve, 5000));

            console.log('✅ Login successful');

            await this.saveCookies();
            return true;

        } catch (error) {
            console.error('❌ Login failed:', error.message);
            return false;
        }
    }

    async loginToShopify(page) {
        console.log('🔐 Attempting Shopify login...');

        try {
            await page.goto(config.shopify.loginUrl);
            await page.waitForSelector('input[id="account_email"]');

            await page.fill('input[id="account_email"]', config.shopify.email);
            await new Promise(resolve => setTimeout(resolve, 3000));
            await page.click('button[name="commit"]');
            await new Promise(resolve => setTimeout(resolve, 3000));

            await page.fill('input[id="account_password"]', config.shopify.password);
            await new Promise(resolve => setTimeout(resolve, 3000));
            await page.click('button[name="commit"]');
            await new Promise(resolve => setTimeout(resolve, 5000));
            console.log('✅ Shopify login successful');

            // Try navigating to home again
            console.log('✅ Navigating to Shopify home...');
            await page.goto(config.shopify.homeUrl);
            await new Promise(resolve => setTimeout(resolve, 3000));
            //cases when user profile needed to be selected before navigating to home
            const userCardEmail = page.locator('div[class="user-card "]');
            const count = await userCardEmail.count();
            if (count > 0) {
                console.log('✅ User profiles found, clicking...');
                const text = await userCardEmail.textContent();
                if (text && text.includes(config.shopify.email)) {
                    console.log('✅ User profile found, clicking...');
                    await userCardEmail.click();
                    console.log('✅ User profile clicked');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

            // Save cookies from this specific page context
            const cookies = await page.context().cookies();
            const shopifyCookiePath = config.shopify.cookiePath;
            await fs.writeJson(shopifyCookiePath, cookies, { spaces: 2 });
            console.log('✅ Shopify cookies saved successfully');
            return true;

        } catch (error) {
            console.error('❌ Shopify login failed:', error.message);
            return false;
        }
    }

    async ensureShopifyLoggedIn() {
        try {
            // Open a new tab for Shopify first
            const shopifyTab = await this.browser.newPage();

            // Load Shopify cookies into this specific tab context
            const shopifyCookiePath = config.shopify.cookiePath;
            if (await fs.pathExists(shopifyCookiePath)) {
                console.log('🍪 Loading saved Shopify cookies...');
                const cookies = await fs.readJson(shopifyCookiePath);
                await shopifyTab.context().addCookies(cookies);
                console.log('✅ Shopify cookies loaded successfully');
            }

            await shopifyTab.goto(config.shopify.homeUrl);
            await new Promise(resolve => setTimeout(resolve, 3000));

            const currentUrl = shopifyTab.url();

            // Check if redirected to login
            if (currentUrl.includes(config.shopify.loginUrl) ||
                currentUrl.includes(config.shopify.loginUrl2)) {
                console.log('🔐 Shopify cookies expired, attempting fresh login...');
                const loginSuccess = await this.loginToShopify(shopifyTab);
                if (!loginSuccess) {
                    //await shopifyTab.close();
                    return null;
                }
            }

            // Verify login was successful
            const finalUrl = shopifyTab.url();
            if (finalUrl.includes(config.shopify.loginUrl) ||
                finalUrl.includes(config.shopify.loginUrl2)) {
                console.log('❌ Shopify login verification failed');
                //await shopifyTab.close();
                return null;
            }

            console.log('✅ Shopify login confirmed');
            return shopifyTab;

        } catch (error) {
            console.error('❌ Error ensuring Shopify login:', error.message);
            return null;
        }
    }

    async processShipmentFromOrderPage(shipmentID) {
        try {
            console.log(`\n🔍 Processing shipment ID from order page: ${shipmentID}`);

            // Get all open tabs
            const pages = this.browser.pages();

            // Find the Shopify tab (should be one of the open tabs)
            let shopifyTab = null;
            for (const page of pages) {
                const url = page.url();
                if (url.includes('admin.shopify.com') && url.includes('orders')) {
                    shopifyTab = page; //take last shopify page
                }
            }

            if (!shopifyTab) {
                console.log('⚠️ Could not find Shopify order tab');
                return false;
            }

            // Switch to iframe on current order page
            const iframe = shopifyTab.frameLocator('iframe[name="app-iframe"]');

            // Wait a bit for page to be ready
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Open Packlink tab
            const packlinkTab = await this.browser.newPage();
            this.initPageInterceptor(packlinkTab);
            console.log('📂 Opened new tab for Packlink');

            await packlinkTab.goto(config.urls.main);
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Click filter button
            const filterButton = await packlinkTab.locator('span[data-id="ICON-FILTER"]');
            await filterButton.click();
            console.log('✅ Clicked filter button');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Enter shipment ID in filter
            const shipmentInput = packlinkTab.locator('input[id="shipment_custom_reference"]');
            await shipmentInput.scrollIntoViewIfNeeded();
            await shipmentInput.fill(shipmentID);
            console.log(`✅ Entered shipment ID: ${shipmentID}`);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Click apply button
            const applyButton = packlinkTab.locator('button[data-id="side-panel-footer-action"]');
            await applyButton.click();
            console.log('✅ Clicked apply button');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Click see details button, check for null 
            const seeDetailsButton = packlinkTab.locator('button[data-id="shipment-row-see-details-button"]');
            if (seeDetailsButton) {
                await seeDetailsButton.click();
                console.log('✅ Clicked see details button');
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                console.log('❌ See details button not found');
                return false;
            }

            // Get tracking carrier section text
            const trackingCarrierSection = packlinkTab.locator('ul[data-id="tracking-carrier-section"]');
            const carrierText = await trackingCarrierSection.textContent();
            console.log(`📦 Extracted carrier text: ${carrierText?.trim()}`);

            // Click print label button
            const printButton = packlinkTab.locator('button[data-id="print-label-button"]');
            await printButton.click();
            console.log('✅ Clicked print label button');
            await new Promise(resolve => setTimeout(resolve, 7000));

            // Go back to Shopify tab and fill form
            shopifyTab.bringToFront();
            console.log('📂 Switched to Shopify tab');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Re-fetch iframe to access the form elements
            const iframeForm = shopifyTab.frameLocator('iframe[name="app-iframe"]');

            // Set carrier select to LaPoste first
            const carrierSelect = iframeForm.locator('select#carrierselect');
            await carrierSelect.scrollIntoViewIfNeeded();
            await carrierSelect.selectOption({ value: 'laposte' });
            console.log('✅ Set carrier to LaPoste');

            // Fill tracking input
            const trackingInput = iframeForm.locator('input[id="trackinginput"]');
            await trackingInput.scrollIntoViewIfNeeded();
            await trackingInput.fill(carrierText?.trim() || '');
            console.log(`✅ Filled tracking input: ${carrierText?.trim()}`);
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log(`✅ Successfully processed shipment ID: ${shipmentID}`);

            return true;

        } catch (error) {
            console.error(`❌ Error processing shipment ${shipmentID}:`, error.message);
            return false;
        }
    }

    async setupShopifyButtonListener(shopifyTab) {
        // Only expose function if not already exposed
        if (!this.functionExposed) {
            console.log('🔧 Exposing triggerShipmentProcessing function...');
            // Expose a function to be called from the page
            await shopifyTab.exposeFunction('triggerShipmentProcessing', async () => {
                // Extract shipment ID from iframe
                const iframe = shopifyTab.frameLocator('iframe[name="app-iframe"]');
                const h1Locator = iframe.locator('h1.Polaris-Header-Title.Polaris-Header-Title__TitleWithSubtitle');
                const shipmentID = await h1Locator.textContent();
                const cleanShipmentID = shipmentID ? shipmentID.replace('#', '').trim() : null;

                console.log(`\n🎯 Processing shipment triggered: ${cleanShipmentID}`);

                if (!cleanShipmentID) {
                    console.log('❌ Could not extract shipment ID');
                    return;
                }

                await this.processShipmentFromOrderPage(cleanShipmentID);

                // DO NOT Navigate back to Shopify homepage after processing
                // console.log('🏠 Navigating back to Shopify homepage...');
                // await shopifyTab.goto(config.shopify.homeUrl);
            });
            this.functionExposed = true;
        }

        await this.setupButtonOnly(shopifyTab);
    }

    async setupButtonOnly(shopifyTab) {
        // Check if we're on an order page before setting up button
        const currentUrl = shopifyTab.url();
        console.log('🔘 Checking URL for button setup:', currentUrl);

        if (!currentUrl.includes('/orders/')) {
            console.log('⏭️ Not on order page, removing button if exists...');
            // Remove existing button if we navigate away from order page
            await shopifyTab.evaluate(() => {
                const existingButton = document.getElementById('packlink-automation-btn');
                if (existingButton) {
                    console.log('🗑️ Removing existing button');
                    existingButton.remove();
                }
            });
            return;
        }

        console.log('🔘 Setting up automation button on order page...');
        //wait for 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if h1 element exists in iframe before creating button
        try {
            const iframe = shopifyTab.frameLocator('iframe[name="app-iframe"]');
            const h1Locator = iframe.locator('h1.Polaris-Header-Title.Polaris-Header-Title__TitleWithSubtitle');
            const count = await h1Locator.count();

            if (count === 0) {
                console.log('⏭️ H1 element not found yet, removing button if exists...');
                await shopifyTab.evaluate(() => {
                    const existingButton = document.getElementById('packlink-automation-btn');
                    if (existingButton) {
                        console.log('🗑️ Removing existing button');
                        existingButton.remove();
                    }
                });
                return;
            }

            console.log('✅ H1 element found, creating button...');
        } catch (error) {
            console.log('⏭️ Error checking for h1 element:', error.message);
            return;
        }

        // Add button to page for triggering automation
        await shopifyTab.evaluate(() => {
            console.log('🔧 Starting button setup...');
            console.log('📄 Current URL:', window.location.href);

            // Remove existing button if it exists
            const existingButton = document.getElementById('packlink-automation-btn');
            if (existingButton) {
                console.log('🗑️ Removing existing button');
                existingButton.remove();
            }

            // Function to process shipment
            const processShipment = async () => {
                console.log('🔘 Process button clicked!');

                const currentUrl = window.location.href;
                console.log('🌐 Current URL:', currentUrl);

                // Check if we're on an order details page
                if (currentUrl.includes('/orders/')) {
                    console.log('🔍 Order page detected, extracting shipment ID...');

                    // Call exposed function to get shipment ID from iframe
                    if (window.triggerShipmentProcessing) {
                        console.log('🚀 Calling triggerShipmentProcessing...');
                        // We'll get the shipment ID from the iframe in the exposed function
                        await window.triggerShipmentProcessing(null);
                    } else {
                        console.log('❌ triggerShipmentProcessing not available');
                    }
                } else {
                    console.log('⚠️ Not on an order details page, current URL:', currentUrl);
                }
            };

            // Create button
            const button = document.createElement('button');
            button.id = 'packlink-automation-btn';
            button.textContent = 'Process with Packlink';
            button.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 999999;
                background: #007bff;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            // Add hover effect
            button.addEventListener('mouseenter', () => {
                button.style.background = '#0056b3';
                button.style.transform = 'scale(1.05)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = '#007bff';
                button.style.transform = 'scale(1)';
            });

            // Add click handler
            button.addEventListener('click', processShipment);

            // Append to body
            document.body.appendChild(button);

            console.log('✅ Process button added to page');
            console.log('📊 Document ready state:', document.readyState);
            console.log('🔗 triggerShipmentProcessing available:', typeof window.triggerShipmentProcessing !== 'undefined');
        });

        console.log('✅ Button setup completed');
    }

    async runShipmentAutomation() {
        try {
            console.log('\n🚀 Starting shipment automation...');

            // Ensure Shopify login
            const shopifyTab = await this.ensureShopifyLoggedIn();
            if (!shopifyTab) {
                console.log('❌ Failed to login to Shopify, aborting automation');
                return;
            }

            // Setup button on the Shopify tab
            await this.setupShopifyButtonListener(shopifyTab);

            // Monitor for navigation to re-setup button
            shopifyTab.on('framenavigated', async () => {
                // Re-setup button after navigation
                await this.setupShopifyButtonListener(shopifyTab);
            });

            console.log('✅ Shipment automation ready. Navigate to an order page and click the "Process with Packlink" button.');

            // Keep the process running
            await new Promise(() => { });

        } catch (error) {
            console.error('❌ Error in shipment automation:', error.message);
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
                await this.page.goto(config.urls.main);
                //wait for 9 seconds
                await new Promise(resolve => setTimeout(resolve, 9000));
                //check if the current url is the main url
                const currentUrl = this.page.url();
                if (currentUrl != config.urls.main) {
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

            // Run shipment automation after successful login
            await this.runShipmentAutomation();

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