const { Actor } = require('apify');
const { chromium } = require('playwright');

// Brand and model mapping (this would need to be expanded based on the actual site)
const BRAND_MAP = {
    'BMW': 9,
    'Mercedes': 10, // This needs to be verified
    'Audi': 11,     // This needs to be verified
    // Add more brands as needed
};

const MODEL_MAP = {
    'BMW': {
        '530': 1652,
        '320': 1653, // This needs to be verified
        // Add more BMW models as needed
    }
    // Add more brand/model mappings as needed
};

Actor.main(async () => {
    console.log('Starting Carzilla.de scraper...');

    const input = await Actor.getInput();
    console.log('Input parameters:', input);

    // Default parameters if none provided
    const {
        make = 'BMW',
        model = '530',
        price_max = null,
        mileage_max = null,
        first_registration_date = null,
        maxPages = 1,
        headless = true
    } = input || {};

    // Build search URL
    const searchUrl = buildSearchUrl({ make, model, price_max, mileage_max, first_registration_date });
    console.log('Search URL:', searchUrl);

    const browser = await chromium.launch({ headless });
    const context = await browser.newContext();
    const page = await context.newPage();

    const results = [];

    try {
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            console.log(`Scraping page ${pageNum}...`);

            // Navigate to the listing page
            const pageUrl = pageNum === 1 ? searchUrl : `${searchUrl}&page=${pageNum}`;
            await page.goto(pageUrl, { waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);

            // Extract car listings
            const cars = await extractCarListings(page);
            console.log(`Found ${cars.length} cars on page ${pageNum}`);

            results.push(...cars);

            // Check if there are more pages
            const hasNextPage = await page.evaluate(() => {
                const nextButton = document.querySelector('.pagination a:contains("›")');
                return nextButton && !nextButton.classList.contains('disabled');
            });

            if (!hasNextPage) {
                console.log('No more pages available');
                break;
            }
        }

        console.log(`Total cars scraped: ${results.length}`);

        // Save results
        await Actor.pushData({
            items: results,
            total: results.length.toString(),
            max_pages: maxPages,
            endpoint: `apify://carzilla-${Date.now()}`
        });

    } catch (error) {
        console.error('Error during scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
});

function buildSearchUrl({ make, model, price_max, mileage_max, first_registration_date }) {
    const brandId = BRAND_MAP[make];
    const modelId = MODEL_MAP[make] && MODEL_MAP[make][model];

    if (!brandId) {
        throw new Error(`Brand ${make} not supported. Available brands: ${Object.keys(BRAND_MAP).join(', ')}`);
    }

    let url = `https://carzilla.de/Fahrzeuge/Fahrzeugliste?m=${brandId}`;

    if (modelId) {
        url += `&mo=${modelId}`;
    }

    // Add additional filters if needed
    // Note: These parameter names would need to be discovered through further analysis
    if (price_max) {
        url += `&price_max=${price_max}`;
    }
    if (mileage_max) {
        url += `&mileage_max=${mileage_max}`;
    }
    if (first_registration_date) {
        url += `&year_min=${first_registration_date}`;
    }

    return url;
}

async function extractCarListings(page) {
    return await page.evaluate(() => {
        const cars = [];
        const carElements = document.querySelectorAll('.panel.panel-default');

        carElements.forEach((element, index) => {
            const car = {};

            // Generate unique ID
            car.id = `carzilla-${Date.now()}-${index}`;

            // Extract make and model from title
            const titleElement = element.querySelector('.panel-title.cc-title');
            if (titleElement) {
                const fullTitle = titleElement.textContent.trim();
                const titleParts = fullTitle.split(' ');
                car.make = titleParts[0] || '';
                car.description = fullTitle;
            }

            // Extract price
            const priceElement = element.querySelector('[class*="price"]');
            if (priceElement) {
                const priceText = priceElement.textContent;
                // Extract the main price (look for € pattern)
                const priceMatch = priceText.match(/([\\d\\.]+)\\s*€/);
                if (priceMatch) {
                    car.price_bruto = priceMatch[1].replace('.', '');
                }
            }

            // Extract VAT info
            const vatElement = element.querySelector('*');
            if (vatElement && vatElement.textContent.includes('MwSt. ausweisbar')) {
                car.vat = '19';
            } else {
                car.vat = '0'; // MwSt. nicht ausweisbar
            }

            // Extract specifications from the details text
            const allText = element.textContent;

            // Extract mileage
            const mileageMatch = allText.match(/([\\d\\.]+)\\s*km/);
            if (mileageMatch) {
                car.mileage = mileageMatch[1].replace('.', '');
            }

            // Extract registration date
            const dateMatch = allText.match(/EZ\\s+(\\w+)\\s+(\\d{4})/);
            if (dateMatch) {
                const month = dateMatch[1];
                const year = dateMatch[2];
                // Convert German month names to numbers
                const monthMap = {
                    'Januar': '01', 'Februar': '02', 'März': '03', 'April': '04',
                    'Mai': '05', 'Juni': '06', 'Juli': '07', 'August': '08',
                    'September': '09', 'Oktober': '10', 'November': '11', 'Dezember': '12'
                };
                const monthNum = monthMap[month] || '01';
                car.first_registration = `${year}-${monthNum}`;
            }

            // Extract power
            const powerMatch = allText.match(/(\\d+)\\s*kW\\s*\\((\\d+)\\s*PS\\)/);
            if (powerMatch) {
                car.power = powerMatch[1]; // kW value
            }

            // Extract fuel type
            if (allText.includes('Benzin')) {
                car.fuel = 'PETROL';
            } else if (allText.includes('Diesel')) {
                car.fuel = 'DIESEL';
            } else if (allText.includes('Hybrid')) {
                car.fuel = 'HYBRID';
            } else if (allText.includes('Elektro')) {
                car.fuel = 'ELECTRICITY';
            }

            // Extract transmission
            if (allText.includes('Automatik')) {
                car.gearbox = 'AUTOMATIC_GEAR';
            } else if (allText.includes('Schaltgetriebe') || allText.includes('Manuell')) {
                car.gearbox = 'MANUAL_GEAR';
            }

            // Extract color
            const colorMatch = allText.match(/Automatik\\s+(\\w+)/);
            if (colorMatch) {
                car.color = colorMatch[1];
            }

            // Extract image
            const imageElement = element.querySelector('img');
            if (imageElement && imageElement.src && !imageElement.src.includes('carzilla-de-02.png')) {
                car.photo_url = imageElement.src;
            }

            // Extract detail URL and create WhatsApp link
            const linkElement = element.querySelector('a.cc-link-vehicle-detail');
            if (linkElement) {
                const detailUrl = linkElement.href;
                car.detail_url = `https://wa.me/34621339515?text=Info%20${encodeURIComponent(car.make || 'Car')}%20${encodeURIComponent(car.description || '')}%20${encodeURIComponent(detailUrl)}`;
            }

            // Set source
            car.source = 'apify';

            // Only add car if it has essential data
            if (car.make && (car.price_bruto || car.description)) {
                cars.push(car);
            }
        });

        return cars;
    });
}

module.exports = Apify;