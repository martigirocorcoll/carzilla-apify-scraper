const { chromium } = require('playwright');

async function analyzeCarzilla() {
    console.log('Starting Carzilla.de analysis...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Navigate to the main page
        console.log('Navigating to Carzilla.de...');
        await page.goto('https://www.carzilla.de', { waitUntil: 'networkidle' });

        // Take a screenshot to see the layout
        await page.screenshot({ path: 'carzilla-homepage.png', fullPage: true });
        console.log('Homepage screenshot saved');

        // Look for search functionality
        console.log('Looking for search functionality...');

        // Try to find search forms or buttons
        const searchElements = await page.locator('input, select, button').all();
        console.log(`Found ${searchElements.length} form elements`);

        // Check if there's a search page or fahrzeugsuche
        console.log('Trying to navigate to vehicle search...');
        try {
            await page.goto('https://www.carzilla.de/fahrzeugsuche', { waitUntil: 'networkidle' });
            await page.screenshot({ path: 'carzilla-search.png', fullPage: true });
            console.log('Search page screenshot saved');

            // Analyze the search page structure
            const title = await page.title();
            console.log('Search page title:', title);

            // Look for form elements
            const forms = await page.locator('form').all();
            console.log(`Found ${forms.length} forms on search page`);

            // Look for filter elements
            const filters = await page.locator('select, input[type="text"], input[type="number"]').all();
            console.log(`Found ${filters.length} filter elements`);

            // Try a test search for BMW
            console.log('Attempting BMW search...');
            await page.goto('https://www.carzilla.de/fahrzeugsuche?make=BMW', { waitUntil: 'networkidle' });
            await page.screenshot({ path: 'carzilla-bmw-search.png', fullPage: true });
            console.log('BMW search results screenshot saved');

            // Look for car listings
            const carListings = await page.locator('[class*="vehicle"], [class*="car"], [class*="listing"], [data-testid*="vehicle"]').all();
            console.log(`Found ${carListings.length} potential car listing elements`);

            // Get page HTML to analyze structure
            const html = await page.content();
            console.log('Page HTML length:', html.length);

        } catch (searchError) {
            console.log('Search page error:', searchError.message);
        }

    } catch (error) {
        console.error('Error during analysis:', error);
    } finally {
        await browser.close();
    }
}

// Run the analysis
analyzeCarzilla().catch(console.error);