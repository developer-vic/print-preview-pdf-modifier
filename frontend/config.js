require('dotenv').config();

const config = {
    // Browser settings
    browser: {
        headless: false, // Set to true for headless mode
        args: [
            '--start-maximized', // Start browser maximized
            '--disable-web-security', // Disable web security for broader access (use with caution)
            '--disable-features=VizDisplayCompositor' // May help with some rendering issues
        ]
    },

    // User credentials
    credentials: {
        email: process.env.EMAIL || '',
        password: process.env.PASSWORD || ''
    },
    
    // URLs
    urls: {
        login: process.env.LOGIN_URL || '',
        main: process.env.MAIN_URL || '',
        shipment: process.env.SHIPMENT_URL || ''
    },
    
    // Text replacement settings
    textReplacement: {
        find: process.env.FIND_TEXT || '',
        replace: process.env.REPLACE_TEXT || ''
    },

    // Backend service configuration
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',

    // Print button selector
    printButton: {
        selector: 'button[data-id="print-label-button"]'
    },

    // Wait time after print button click (in milliseconds)
    waitTime: 3000,

    // Cookie file path
    cookiePath: process.env.COOKIE_PATH || 'cookies.json'
};

module.exports = config;
