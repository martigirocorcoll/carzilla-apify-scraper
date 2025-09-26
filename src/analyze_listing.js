const { chromium } = require('playwright');

async function analyzeListingPage() {
    console.log('Analyzing BMW 530 listing page on Carzilla.de...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Navigate to the specific BMW 530 search results
        console.log('Navigating to BMW 530 search results...');
        await page.goto('https://carzilla.de/Fahrzeuge/Fahrzeugliste?m=9&mo=1652', { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // Take screenshot
        await page.screenshot({ path: 'carzilla-bmw-530-results.png', fullPage: true });
        console.log('BMW 530 results screenshot saved');

        // Get page title and basic info
        const title = await page.title();
        console.log('Page title:', title);

        // Analyze URL pattern
        console.log('\n=== URL PATTERN ANALYSIS ===');
        console.log('URL structure: m=9 (BMW brand ID), mo=1652 (530 model ID)');

        // Look for car listings on this page
        console.log('\n=== EXTRACTING CAR LISTINGS ===');
        const carListings = await page.evaluate(() => {
            const cars = [];

            // Try various selectors that might contain car listings
            const selectors = [
                '.vehicle-item',
                '.car-item',
                '.listing-item',
                '.vehicle',
                '.car',
                '.listing',
                '.result',
                '.media',
                '.thumbnail',
                '.panel',
                '[class*="vehicle"]',
                '[class*="car"]',
                '[class*="item"]',
                '[class*="listing"]'
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                console.log(`Selector ${selector}: ${elements.length} elements`);

                if (elements.length > 0 && elements.length < 50) { // Reasonable number for car listings
                    Array.from(elements).slice(0, 3).forEach((element, index) => {
                        const car = {
                            selector: selector,
                            index: index,
                            className: element.className
                        };

                        // Extract price
                        const priceSelectors = [
                            '[class*="price"]',
                            '[class*="euro"]',
                            '[class*="cost"]',
                            'span:contains("€")',
                            'div:contains("€")'
                        ];

                        for (const priceSelector of priceSelectors) {
                            const priceEl = element.querySelector(priceSelector);
                            if (priceEl && priceEl.textContent.includes('€')) {
                                car.price = priceEl.textContent.trim();
                                break;
                            }
                        }

                        // Extract title/model info
                        const titleEl = element.querySelector('h1, h2, h3, h4, h5, [class*="title"], [class*="name"], [class*="model"]');
                        if (titleEl) car.title = titleEl.textContent.trim();

                        // Extract mileage
                        const mileageEl = element.querySelector('[class*="km"], [class*="mileage"]');
                        if (mileageEl) car.mileage = mileageEl.textContent.trim();

                        // Extract year
                        const yearEl = element.querySelector('[class*="year"], [class*="date"]');
                        if (yearEl) car.year = yearEl.textContent.trim();

                        // Extract image
                        const imgEl = element.querySelector('img');
                        if (imgEl && imgEl.src && !imgEl.src.includes('carzilla-de-02.png')) {
                            car.image = imgEl.src;
                        }

                        // Extract link
                        const linkEl = element.querySelector('a');
                        if (linkEl) car.link = linkEl.href;

                        // Get all text for analysis
                        car.allText = element.textContent.replace(/\s+/g, ' ').trim().substring(0, 300);

                        // Only include if it has some car-like data
                        if (car.price || car.title || car.image || car.allText.includes('BMW') || car.allText.includes('530')) {
                            cars.push(car);
                        }
                    });

                    if (cars.length > 0) break; // Stop at first successful selector
                }
            }

            return cars;
        });

        console.log('Car listings found:', JSON.stringify(carListings, null, 2));

        // Look for specific BMW 530 data patterns
        console.log('\n=== LOOKING FOR BMW 530 SPECIFIC DATA ===');
        const bmwData = await page.evaluate(() => {
            const bmwElements = [];

            // Find elements containing BMW or 530
            const allElements = document.querySelectorAll('*');
            Array.from(allElements).forEach(el => {
                const text = el.textContent;
                if ((text.includes('BMW') || text.includes('530')) &&
                    text.length < 500 && // Not too long
                    el.children.length < 10) { // Not a container with many children
                    bmwElements.push({
                        tagName: el.tagName,
                        className: el.className,
                        text: text.trim().substring(0, 200)
                    });
                }
            });

            return bmwElements.slice(0, 10); // First 10 relevant elements
        });

        console.log('BMW 530 specific elements:', JSON.stringify(bmwData, null, 2));

        // Check if there are any network requests for loading car data
        console.log('\n=== MONITORING NETWORK REQUESTS ===');
        const apiCalls = [];

        page.on('response', response => {
            const url = response.url();
            if (url.includes('api') ||
                url.includes('search') ||
                url.includes('vehicle') ||
                url.includes('fahrzeug') ||
                url.includes('ajax') ||
                url.includes('json')) {
                apiCalls.push({
                    url: url,
                    status: response.status(),
                    contentType: response.headers()['content-type']
                });
            }
        });

        // Reload to capture network calls
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        console.log('API calls detected:', JSON.stringify(apiCalls, null, 2));

        // Try to find pagination or result count
        console.log('\n=== PAGINATION AND RESULT COUNT ===');
        const pageInfo = await page.evaluate(() => {
            const info = {};

            // Look for result count
            const countElements = document.querySelectorAll('*');
            Array.from(countElements).forEach(el => {
                const text = el.textContent;
                if (text.match(/\d+\s*(treffer|ergebnis|fahrzeug|results?)/i)) {
                    info.resultCount = text.trim();
                }
            });

            // Look for pagination
            const paginationElements = document.querySelectorAll('[class*="pag"], [class*="page"], nav');
            info.paginationElements = Array.from(paginationElements).map(el => ({
                className: el.className,
                text: el.textContent.trim().substring(0, 100)
            }));

            return info;
        });

        console.log('Page info:', JSON.stringify(pageInfo, null, 2));

    } catch (error) {
        console.error('Error during listing analysis:', error);
    } finally {
        await browser.close();
    }
}

// Run the analysis
analyzeListingPage().catch(console.error);