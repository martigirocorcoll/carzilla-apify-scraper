// Core scraper functionality - can be used both in Apify and for local testing
const { chromium } = require('playwright');
const { BRAND_MAP, MODEL_MAP } = require('../final_complete_mappings.js');
const { mapBrandName, mapModelName } = require('../mapping_layer.js');
const { buildCarzillaURL, getCheckboxFilters, isSearchSupported } = require('./parameter_mapping.js');

class CarzillaScraper {
    constructor(options = {}) {
        this.options = {
            headless: true,
            timeout: 20000,
            ...options
        };
    }

    async scrape(input) {
        console.log('🚗 Starting Carzilla.de scraping...');
        console.log('📥 Input parameters:', JSON.stringify(input, null, 2));

        const {
            make = 'BMW',
            model = null,
            model_description = null,
            price_min = null,
            price_max = null,
            mileage_max = null,
            first_registration_date = null,
            fuel = null,
            potencia = null,
            transmision = null,
            fourwheeldrive = null,
            maxPages = 1
        } = input || {};

        // Check if search is supported
        const supportCheck = isSearchSupported({ make, model });
        console.log('🔍 Search support check:', supportCheck);

        if (!supportCheck.supported) {
            console.log('❌ Search not supported, returning empty results');
            return {
                items: [],
                total: "0",
                max_pages: 1,
                endpoint: "apify://unsupported-search",
                error: supportCheck.reason,
                alternatives: supportCheck.alternativeBrands
            };
        }

        if (supportCheck.warning) {
            console.log('⚠️ Warning:', supportCheck.warning);
        }

        // Map brand/model names to Carzilla format
        const mappedMake = mapBrandName(make);
        const mappedModel = mapModelName(make, model);

        // Build search URL
        const searchUrl = buildCarzillaURL({
            make: mappedMake,
            model: mappedModel,
            model_description,
            price_min,
            price_max,
            mileage_max,
            first_registration_date,
            fuel,
            potencia,
            transmision,
            fourwheeldrive
        });

        if (!searchUrl) {
            console.log('❌ Could not build search URL, returning empty results');
            return {
                items: [],
                total: "0",
                max_pages: 1,
                endpoint: "apify://invalid-url"
            };
        }

        console.log('🔗 Search URL:', searchUrl);
        console.log('📊 URL includes: 20 results per page, sorted by price ascending');

        // Set up browser
        const browser = await chromium.launch({
            headless: this.options.headless,
            timeout: this.options.timeout
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();
        page.setDefaultTimeout(this.options.timeout);
        page.setDefaultNavigationTimeout(this.options.timeout);

        const results = [];
        const startTime = Date.now();

        try {
            console.log('🌐 Navigating to Carzilla.de...');

            // Navigate with retries
            let navigationSuccess = false;
            for (let attempt = 1; attempt <= 3 && !navigationSuccess; attempt++) {
                try {
                    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 15000 });
                    navigationSuccess = true;
                    console.log(`✅ Navigation successful on attempt ${attempt}`);
                } catch (navError) {
                    console.log(`⚠️ Navigation attempt ${attempt} failed:`, navError.message);
                    if (attempt === 3) throw navError;
                    await page.waitForTimeout(2000);
                }
            }

            // Wait for content to load
            await page.waitForTimeout(3000);

            // Apply additional checkbox filters if needed
            const checkboxFilters = getCheckboxFilters({
                fuel, transmision, fourwheeldrive
            });

            for (const filter of checkboxFilters) {
                try {
                    await page.check(`#${filter.id}`);
                    console.log(`✅ Applied filter: ${filter.name}`);
                    await page.waitForTimeout(1000);
                } catch (filterError) {
                    console.log(`⚠️ Could not apply filter ${filter.name}:`, filterError.message);
                }
            }

            // Extract car listings
            console.log('🚙 Extracting car listings...');
            const cars = await this.extractCarListings(page, { make: mappedMake });

            console.log(`📊 Found ${cars.length} cars`);
            results.push(...cars);

            // Check execution time
            const elapsed = Date.now() - startTime;
            console.log(`⏱️ Execution time: ${elapsed}ms`);

            return {
                items: results,
                total: results.length.toString(),
                max_pages: 1,
                endpoint: `apify://carzilla-${Date.now()}`,
                search_url: searchUrl,
                execution_time_ms: elapsed,
                parameters_used: {
                    make: mappedMake,
                    model: mappedModel,
                    price_range: { min: price_min, max: price_max },
                    filters_applied: checkboxFilters.length
                }
            };

        } catch (error) {
            console.error('❌ Error during scraping:', error);

            return {
                items: results,
                total: results.length.toString(),
                max_pages: 1,
                endpoint: `apify://carzilla-error-${Date.now()}`,
                error: error.message,
                partial_results: results.length > 0
            };

        } finally {
            await browser.close();
            const totalTime = Date.now() - startTime;
            console.log(`🏁 Total execution time: ${totalTime}ms`);
        }
    }

    async extractCarListings(page, options = {}) {
        return await page.evaluate((opts) => {
            const cars = [];
            const carElements = document.querySelectorAll('.panel.panel-default');

            carElements.forEach((element, index) => {
                try {
                    const car = {};

                    // Generate unique ID
                    car.id = `carzilla-${Date.now()}-${index}`;

                    // Extract make and description from title
                    const titleElement = element.querySelector('.panel-title.cc-title, h3.panel-title');
                    if (titleElement) {
                        const fullTitle = titleElement.textContent.trim();
                        const titleParts = fullTitle.split(/\s+/);
                        car.make = titleParts[0] || opts.make || '';
                        car.description = fullTitle.replace(car.make, '').trim();
                    }

                    // Extract price
                    const allText = element.textContent;
                    // Look for price patterns like "35.000 €" or "35000 €"
                    const priceMatch = allText.match(/(\d{1,3}(?:\.\d{3})*)s*€/g);
                    if (priceMatch) {
                        // Get the largest price (likely the main price, not monthly rate)
                        const prices = priceMatch.map(p => parseInt(p.replace(/[^\d]/g, '')));
                        const mainPrice = Math.max(...prices);
                        if (mainPrice > 1000) { // Reasonable car price
                            car.price_bruto = mainPrice.toString();
                        }
                    }

                    // Extract VAT info
                    if (allText.includes('MwSt. ausweisbar')) {
                        car.vat = '19';
                    } else if (allText.includes('MwSt. nicht ausweisbar')) {
                        car.vat = '0';
                    } else {
                        car.vat = '19'; // Default
                    }

                    // Extract mileage
                    const mileageMatch = allText.match(/(\d{1,3}(?:\.\d{3})*)\s*km/i);
                    if (mileageMatch) {
                        car.mileage = mileageMatch[1].replace(/\./g, '');
                    }

                    // Extract registration date
                    const dateMatch = allText.match(/EZ\s+(\w+)\s+(\d{4})/i);
                    if (dateMatch) {
                        const monthName = dateMatch[1];
                        const year = dateMatch[2];

                        // Convert German month names to numbers
                        const monthMap = {
                            'januar': '01', 'februar': '02', 'märz': '03', 'april': '04',
                            'mai': '05', 'juni': '06', 'juli': '07', 'august': '08',
                            'september': '09', 'oktober': '10', 'november': '11', 'dezember': '12'
                        };

                        const monthNum = monthMap[monthName.toLowerCase()] || '01';
                        car.first_registration = `${year}-${monthNum}`;
                    }

                    // Extract power
                    const powerMatch = allText.match(/(\d+)\s*kW\s*\((\d+)\s*PS\)/i);
                    if (powerMatch) {
                        car.power = powerMatch[1]; // kW value
                    }

                    // Extract fuel type and map to UnifiedCar format
                    const fuelMap = {
                        'benzin': 'PETROL',
                        'diesel': 'DIESEL',
                        'elektro': 'ELECTRICITY',
                        'hybrid': 'HYBRID',
                        'gas': 'LPG',
                        'erdgas': 'CNG',
                        'wasserstoff': 'HYDROGENIUM'
                    };

                    for (const [german, unified] of Object.entries(fuelMap)) {
                        if (allText.toLowerCase().includes(german)) {
                            car.fuel = unified;
                            break;
                        }
                    }

                    // Extract transmission
                    if (allText.toLowerCase().includes('automatik')) {
                        car.gearbox = 'AUTOMATIC_GEAR';
                    } else if (allText.toLowerCase().includes('schaltgetriebe') || allText.toLowerCase().includes('manuell')) {
                        car.gearbox = 'MANUAL_GEAR';
                    } else if (allText.toLowerCase().includes('tiptronic')) {
                        car.gearbox = 'SEMIAUTOMATIC_GEAR';
                    }

                    // Extract color
                    const colorMatch = allText.match(/(?:automatik|schaltgetriebe|manuell)\s+(\w+)/i);
                    if (colorMatch && !['sitzer', 'türer'].includes(colorMatch[1].toLowerCase())) {
                        car.color = colorMatch[1];
                    }

                    // Extract image
                    const imageElement = element.querySelector('img');
                    if (imageElement && imageElement.src && !imageElement.src.includes('carzilla-de-02.png')) {
                        car.photo_url = imageElement.src;
                    }

                    // Create WhatsApp link
                    const carInfo = encodeURIComponent(`${car.make || 'Car'} ${car.description || ''}`);
                    car.detail_url = `https://wa.me/34621339515?text=Información%20sobre%20${carInfo}%20de%20Carzilla.de`;

                    // Set source
                    car.source = 'apify';

                    // Only add car if it has essential data
                    if ((car.make || car.description) && (car.price_bruto || car.description)) {
                        cars.push(car);
                    }

                } catch (error) {
                    console.log(`Error processing car ${index}:`, error.message);
                }
            });

            return cars;
        }, options);
    }
}

module.exports = CarzillaScraper;