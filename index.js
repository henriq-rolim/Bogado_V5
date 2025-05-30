require('dotenv').config();
const { chromium } = require('playwright-core');

const TRAVIAN_URL = 'https://ts100.x10.america.travian.com';
const FARM_LIST_URL = `${TRAVIAN_URL}/build.php?gid=16&tt=99`;

// Validate environment variables
const { TRAVIAN_USER, TRAVIAN_PASS, BROWSERLESS_TOKEN } = process.env;
if (!TRAVIAN_USER || !TRAVIAN_PASS || !BROWSERLESS_TOKEN) {
    console.error('Error: Missing required environment variables (TRAVIAN_USER, TRAVIAN_PASS, BROWSERLESS_TOKEN).');
    console.log('Please create a .env file based on .env.example and fill in your details.');
    process.exit(1);
}

const BROWSERLESS_ENDPOINT = `wss://chrome.browserless.io/playwright?token=${BROWSERLESS_TOKEN}`;

// --- Helper Function for Random Delay ---
function getRandomDelay(minMinutes, maxMinutes) {
    const minMs = minMinutes * 60 * 1000;
    const maxMs = maxMinutes * 60 * 1000;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// --- Main Automation Function ---
async function runAutomation() {
    let browser = null;
    console.log(`[${new Date().toISOString()}] Starting Travian farm list automation...`);

    try {
        console.log('Connecting to Browserless...');
        // Increased connection timeout for potentially slower connections
        browser = await chromium.connect(BROWSERLESS_ENDPOINT, { timeout: 120000 }); 
        console.log('Connected successfully!');

        const context = await browser.newContext({
            // Using a common user agent to reduce fingerprinting
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 } // Set a default viewport
        });
        const page = await context.newPage();
        console.log('Browser context and page created.');

        // --- Login --- 
        console.log(`Navigating to login page: ${TRAVIAN_URL}/login.php`);
        await page.goto(`${TRAVIAN_URL}/login.php`, { waitUntil: 'domcontentloaded', timeout: 90000 });
        console.log('Login page loaded.');

        console.log('Entering username...');
        await page.locator('input[name="name"]').fill(TRAVIAN_USER);
        console.log('Entering password...');
        await page.locator('input[name="password"]').fill(TRAVIAN_PASS);

        console.log('Submitting login form...');
        // Wait for navigation after click, targeting the expected URL
        await Promise.all([
            page.waitForURL(`${TRAVIAN_URL}/dorf1.php`, { waitUntil: 'networkidle', timeout: 90000 }),
            page.locator('button[type="submit"], input[type="submit"]').first().click()
        ]);
        console.log('Login successful, redirected to dorf1.');

        // --- Navigate to Farm List --- 
        console.log(`Navigating to farm list page: ${FARM_LIST_URL}`);
        await page.goto(FARM_LIST_URL, { waitUntil: 'networkidle', timeout: 90000 });
        console.log('Farm list page loaded.');

        // --- Click the Button --- 
        // More specific selector if possible, but text-based should work
        const farmButtonSelector = 'div.startAllFarmLists > div.button-content:has-text("Iniciar todas as listas de farms")'; 
        // Fallback selector if the above is too specific or changes
        const fallbackFarmButtonSelector = 'div:has-text("Iniciar todas as listas de farms")';
        
        console.log(`Looking for button with selector: "${farmButtonSelector}" or fallback "${fallbackFarmButtonSelector}"`);
        let farmButton = page.locator(farmButtonSelector);

        if (!await farmButton.isVisible({ timeout: 5000 })) { // Quick check for primary selector
             console.log('Primary selector not visible, trying fallback...');
             farmButton = page.locator(fallbackFarmButtonSelector);
        }

        if (await farmButton.isVisible()) {
            console.log('Farm list button found. Clicking...');
            await farmButton.click({ timeout: 15000 }); // Increased timeout for click
            console.log('Farm list button clicked successfully!');
            // Wait a bit longer to ensure the action registers on the server
            await page.waitForTimeout(5000); 
        } else {
            console.warn('Farm list button "Iniciar todas as listas de farms" not found or not visible after checking both selectors.');
        }

        console.log('Automation step completed.');

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error during automation:`, error);
        // Consider adding more specific error handling if needed
    } finally {
        if (browser) {
            try {
                console.log('Closing browser connection...');
                await browser.close();
                console.log('Browser connection closed.');
            } catch (closeError) {
                console.error('Error closing browser connection:', closeError);
            }
        }
        console.log(`[${new Date().toISOString()}] Automation run finished.`);
        // Schedule the next run after this one completes (or fails)
        scheduleNextRun(); 
    }
}

// --- Scheduling Function ---
function scheduleNextRun() {
    const delay = getRandomDelay(4, 6); // Get random delay between 4 and 6 minutes
    const nextRunTime = new Date(Date.now() + delay);
    
    console.log(`--------------------------------------------------`);
    console.log(`Next automation run scheduled for: ${nextRunTime.toISOString()}`);
    console.log(`Waiting for ${Math.round(delay / 60000)} minutes (${delay} ms)...`);
    console.log(`--------------------------------------------------`);

    setTimeout(runAutomation, delay);
}

// --- Start the first run --- 
console.log('Starting initial Travian automation run...');
runAutomation(); // Start the first run immediately

// Note: The subsequent runs are scheduled within the 'finally' block of runAutomation

