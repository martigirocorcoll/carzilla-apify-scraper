const { chromium } = require('playwright');

async function detailedAnalysis() {
    console.log('Starting detailed Carzilla.de analysis...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Navigate to BMW search results
        console.log('Navigating to BMW search results...');
        await page.goto('https://www.carzilla.de/fahrzeugsuche?make=BMW', { waitUntil: 'networkidle' });

        // Analyze search filters available
        console.log('\n=== ANALYZING SEARCH FILTERS ===');
        const filters = await page.evaluate(() => {
            const filterElements = [];

            // Look for select elements (dropdowns)
            document.querySelectorAll('select').forEach(select => {
                const options = Array.from(select.options).map(opt => opt.value);
                filterElements.push({
                    type: 'select',
                    name: select.name || select.id,
                    options: options.slice(0, 10) // First 10 options
                });
            });

            // Look for input elements
            document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
                filterElements.push({
                    type: input.type,
                    name: input.name || input.id,
                    placeholder: input.placeholder
                });
            });

            return filterElements;
        });

        console.log('Available filters:', JSON.stringify(filters, null, 2));

        // Analyze car listing structure
        console.log('\n=== ANALYZING CAR LISTINGS ===');
        const carListings = await page.evaluate(() => {
            const listings = [];

            // Try different selectors for car listings
            const selectors = [
                '[class*="vehicle"]',
                '[class*="car"]',
                '[class*="listing"]',
                '[class*="result"]',
                '[data-testid*="vehicle"]',
                '.card',
                '[class*="item"]'
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`Found ${elements.length} elements with selector: ${selector}`);

                    // Analyze first few elements
                    Array.from(elements).slice(0, 3).forEach((element, index) => {
                        const listing = {
                            selector: selector,
                            index: index,
                            className: element.className,
                            innerHTML: element.innerHTML.substring(0, 500), // First 500 chars
                            textContent: element.textContent.substring(0, 200) // First 200 chars
                        };
                        listings.push(listing);
                    });
                    break; // Use first successful selector
                }
            }

            return listings;
        });

        console.log('Car listing elements:', JSON.stringify(carListings, null, 2));

        // Look for specific data points in listings
        console.log('\n=== LOOKING FOR SPECIFIC DATA POINTS ===');
        const dataPoints = await page.evaluate(() => {
            const data = {};

            // Look for price indicators
            const priceElements = document.querySelectorAll('[class*="price"], [class*="cost"], [class*="euro"]');
            data.priceSelectors = Array.from(priceElements).slice(0, 3).map(el => ({
                className: el.className,
                textContent: el.textContent.trim()
            }));

            // Look for mileage indicators
            const mileageElements = document.querySelectorAll('[class*="km"], [class*="mileage"], [class*="kilometer"]');
            data.mileageSelectors = Array.from(mileageElements).slice(0, 3).map(el => ({
                className: el.className,
                textContent: el.textContent.trim()
            }));

            // Look for year indicators
            const yearElements = document.querySelectorAll('[class*="year"], [class*="registration"], [class*="date"]');
            data.yearSelectors = Array.from(yearElements).slice(0, 3).map(el => ({
                className: el.className,
                textContent: el.textContent.trim()
            }));

            // Look for images
            const imageElements = document.querySelectorAll('img');
            data.imageSelectors = Array.from(imageElements).slice(0, 5).map(el => ({
                src: el.src,
                alt: el.alt,
                className: el.className
            }));

            return data;
        });

        console.log('Data points found:', JSON.stringify(dataPoints, null, 2));

        // Try to extract actual car data
        console.log('\n=== EXTRACTING SAMPLE CAR DATA ===');
        const sampleCars = await page.evaluate(() => {
            const cars = [];

            // Try to find car containers and extract data
            const possibleCarContainers = document.querySelectorAll('[class*="vehicle"], [class*="car"], .card, [class*="item"]');

            Array.from(possibleCarContainers).slice(0, 5).forEach((container, index) => {
                const car = {
                    index: index,
                    containerClass: container.className
                };

                // Try to extract price
                const priceEl = container.querySelector('[class*="price"], [class*="euro"]');
                if (priceEl) car.price = priceEl.textContent.trim();

                // Try to extract title/description
                const titleEl = container.querySelector('h1, h2, h3, h4, [class*="title"], [class*="name"]');
                if (titleEl) car.title = titleEl.textContent.trim();

                // Try to extract image
                const imgEl = container.querySelector('img');
                if (imgEl) car.image = imgEl.src;

                // Try to extract link
                const linkEl = container.querySelector('a');
                if (linkEl) car.link = linkEl.href;

                // Get all text content for analysis
                car.allText = container.textContent.replace(/\s+/g, ' ').trim().substring(0, 300);

                cars.push(car);
            });

            return cars;
        });

        console.log('Sample car data:', JSON.stringify(sampleCars, null, 2));

        // Check URL structure for different search parameters
        console.log('\n=== TESTING URL PARAMETERS ===');
        const testUrls = [
            'https://www.carzilla.de/fahrzeugsuche?make=BMW&model=320',
            'https://www.carzilla.de/fahrzeugsuche?make=Mercedes',
            'https://www.carzilla.de/fahrzeugsuche?make=Audi&price_max=50000'
        ];

        for (const url of testUrls) {
            console.log(`Testing URL: ${url}`);
            try {
                await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
                const title = await page.title();
                const resultCount = await page.locator('[class*="result"], [class*="vehicle"], [class*="car"]').count();
                console.log(`  Title: ${title}, Results: ${resultCount}`);
            } catch (error) {
                console.log(`  Error: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('Error during detailed analysis:', error);
    } finally {
        await browser.close();
    }
}

// Run the detailed analysis
detailedAnalysis().catch(console.error);