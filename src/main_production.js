const { Actor } = require('apify');
const { chromium } = require('playwright');

// Import our mapping data and utilities
const { BRAND_MAP, MODEL_MAP } = require('../final_complete_mappings.js');
const { mapBrandName, mapModelName } = require('../mapping_layer.js');
const { buildCarzillaURL, getCheckboxFilters, isSearchSupported } = require('./parameter_mapping.js');

Actor.main(async () => {
    console.log('🚗 Starting Carzilla.de scraper for importocoches.com...');

    const input = await Actor.getInput();
    console.log('📥 Input parameters:', JSON.stringify(input, null, 2));

    // Default parameters matching importocoches.com structure
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
        maxPages = 1,
        headless = true,
        timeout = 20000 // 20 seconds max execution time
    } = input || {};

    // Check if search is supported
    const supportCheck = isSearchSupported({ make, model });
    console.log('🔍 Search support check:', supportCheck);

    if (!supportCheck.supported) {
        console.log('❌ Search not supported, returning empty results');
        await Actor.pushData({
            items: [],
            total: "0",
            max_pages: 1,
            endpoint: "apify://unsupported-search",
            error: supportCheck.reason,
            alternatives: supportCheck.alternativeBrands
        });
        return;
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
        await Actor.pushData({
            items: [],
            total: "0",
            max_pages: 1,
            endpoint: "apify://invalid-url"
        });
        return;
    }

    console.log('🔗 Search URL:', searchUrl);
    console.log('📊 URL includes: 20 results per page, sorted by price ascending');
    console.log('🔍 URL for manual testing: ' + searchUrl);

    // Set up browser with timeout
    const browser = await chromium.launch({
        headless,
        timeout: timeout
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // Set timeouts
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

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

        // Wait for content to load and try to wait for specific elements
        console.log('⏳ Waiting for page content to load...');
        await page.waitForTimeout(5000);

        // Try to wait for car listings to appear
        try {
            await page.waitForSelector('.panel, .vehicle, [class*="car"]', { timeout: 10000 });
            console.log('✅ Found some panel or vehicle elements');
        } catch (waitError) {
            console.log('⚠️ No car elements found with waitForSelector:', waitError.message);
        }

        // Log page info for debugging
        const pageInfo = await page.evaluate(() => {
            return {
                title: document.title,
                currentUrl: window.location.href,
                bodyText: document.body ? document.body.textContent.slice(0, 200) : 'No body found'
            };
        });
        console.log('📄 Current page:', pageInfo);

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

        // Add debugging for element selection
        const debugInfo = await page.evaluate(() => {
            const panels = document.querySelectorAll('.panel.panel-default');
            const allDivs = document.querySelectorAll('div');
            const panelsAny = document.querySelectorAll('.panel');

            return {
                panelDefaultCount: panels.length,
                allDivsCount: allDivs.length,
                panelAnyCount: panelsAny.length,
                bodyHTML: document.body ? document.body.innerHTML.slice(0, 1000) : 'No body',
                hasContent: document.body ? document.body.textContent.length > 100 : false
            };
        });

        console.log('🔍 Debug info:', debugInfo);

        const extractionResult = await extractCarListings(page, { make: mappedMake });
        const cars = extractionResult.cars;
        const logs = extractionResult.logs;

        // Show the internal logs from page.evaluate
        console.log('🔍 Internal extraction logs:');
        logs.forEach(log => console.log(log));

        console.log(`📊 Found ${cars.length} cars`);
        results.push(...cars);

        // Check execution time
        const elapsed = Date.now() - startTime;
        console.log(`⏱️ Execution time: ${elapsed}ms`);

        // Save results in importocoches.com format
        await Actor.pushData({
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
        });

        console.log('✅ Scraping completed successfully');

    } catch (error) {
        console.error('❌ Error during scraping:', error);

        // Return partial results with error info
        await Actor.pushData({
            items: results,
            total: results.length.toString(),
            max_pages: 1,
            endpoint: `apify://carzilla-error-${Date.now()}`,
            error: error.message,
            partial_results: results.length > 0
        });

    } finally {
        await browser.close();
        const totalTime = Date.now() - startTime;
        console.log(`🏁 Total execution time: ${totalTime}ms`);
    }
});

async function extractCarListings(page, options = {}) {
    return await page.evaluate((opts) => {
        const cars = [];
        const logs = [];
        const carElements = document.querySelectorAll('.panel.panel-default');

        logs.push(`🔍 Processing ${carElements.length} car elements`);

        carElements.forEach((element, index) => {
            try {
                const car = {};

                // Generate unique ID
                car.id = `carzilla-${Date.now()}-${index}`;

                // Extract make and description from title
                const titleElement = element.querySelector('h3, heading[level="3"], .panel-title');
                if (titleElement) {
                    const fullTitle = titleElement.textContent.replace(/\\s+/g, ' ').trim();
                    const titleParts = fullTitle.split(/\\s+/);
                    car.make = titleParts[0] || opts.make || '';
                    car.description = fullTitle.replace(car.make, '').trim();
                    logs.push(`🚗 Car ${index}: Found title "${fullTitle}"`);
                } else {
                    logs.push(`❌ Car ${index}: No title element found`);
                    // Fallback: try to extract from any heading or link
                    const fallbackTitle = element.querySelector('a, h1, h2, h3, h4, h5, h6, .title');
                    if (fallbackTitle) {
                        const fallbackText = fallbackTitle.textContent.replace(/\\s+/g, ' ').trim();
                        car.make = opts.make || 'Audi';
                        car.description = fallbackText;
                        logs.push(`🔄 Car ${index}: Used fallback title "${fallbackText}"`);
                    }
                }

                // Extract price - use multiple strategies
                const allText = element.textContent;
                let finalPrice = null;

                // Strategy 1: Look for price in text content
                const pricePatterns = [
                    /(?:^|\\s)(\\d{1,3}(?:\\.\\d{3})*)\\s*€(?:\\s|$)/g,  // 34.440 €
                    /(?:^|\\s)(\\d{4,6})\\s*€(?:\\s|$)/g,                // 34440 €
                    /Preis[:\\s]*(\\d{1,3}(?:\\.\\d{3})*)\\s*€/gi,       // Preis: 34.440 €
                    /€\\s*(\\d{1,3}(?:\\.\\d{3})*)(?:\\s|$)/g           // € 34.440
                ];

                for (const pattern of pricePatterns) {
                    const matches = [...allText.matchAll(pattern)];
                    if (matches.length > 0) {
                        const prices = matches.map(match => {
                            const priceStr = match[1];
                            return parseInt(priceStr.replace(/\\./g, ''));
                        }).filter(p => p > 5000 && p < 200000); // Reasonable car price range

                        if (prices.length > 0) {
                            finalPrice = Math.max(...prices); // Take the highest price (main price)
                            break;
                        }
                    }
                }

                // Strategy 2: Look in innerHTML for price elements
                if (!finalPrice) {
                    const priceElements = element.querySelectorAll('[class*="price"], [class*="preis"], .amount, .cost');
                    for (const priceEl of priceElements) {
                        const priceText = priceEl.textContent;
                        const priceMatch = priceText.match(/(\\d{1,3}(?:\\.\\d{3})*)\\s*€/);
                        if (priceMatch) {
                            const price = parseInt(priceMatch[1].replace(/\\./g, ''));
                            if (price > 5000 && price < 200000) {
                                finalPrice = price;
                                break;
                            }
                        }
                    }
                }

                if (finalPrice) {
                    car.price_bruto = finalPrice.toString();
                    logs.push(`💰 Car ${index}: Found price ${finalPrice}€`);
                } else {
                    logs.push(`❌ Car ${index}: No price found in text: "${allText.slice(0, 300)}"`);
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
                const mileageMatch = allText.match(/(\\d{1,3}(?:[\\.\s]?\\d{3})*)\\s*km/i);
                if (mileageMatch) {
                    car.mileage = mileageMatch[1].replace(/[\\.\s]/g, '');
                }

                // Extract registration date
                const dateMatch = allText.match(/EZ\\s+(\\w+)\\s+(\\d{4})/i);
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
                const powerMatch = allText.match(/(\\d+)\\s*kW\\s*\\((\\d+)\\s*PS\\)/i);
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

                // Extract color (look for color after transmission info)
                const colorMatch = allText.match(/(?:automatik|schaltgetriebe|manuell)\\s+(\\w+)/i);
                if (colorMatch && !['sitzer', 'türer'].includes(colorMatch[1].toLowerCase())) {
                    car.color = colorMatch[1];
                }

                // Extract image - look for the main car image, not icons or logos
                const imageElement = element.querySelector('img[alt*="Bild:"], img[src*="cargate360"], img:not([alt*="Qualitätssiegel"]):not([src*="logo"]):not([src*="icon"])');
                if (imageElement && imageElement.src && !imageElement.src.includes('carzilla-de-02.png') && !imageElement.src.includes('qualitaetssiegel')) {
                    car.photo_url = imageElement.src;
                }

                // Create WhatsApp link with car details
                const linkElement = element.querySelector('a[href*="fahrzeug"], a[href*="BMW"], a[href*="Mercedes"]');
                const carInfo = encodeURIComponent(`${car.make || 'Car'} ${car.description || ''}`);
                car.detail_url = `https://wa.me/34621339515?text=Información%20sobre%20${carInfo}%20de%20Carzilla.de`;

                // Set source
                car.source = 'apify';

                // Debug final car object
                logs.push(`🔍 Car ${index} final data: make="${car.make}", desc="${car.description}", price="${car.price_bruto}", hasTitle=${!!titleElement}`);
                logs.push(`📝 Car ${index} element text: ${element.textContent.slice(0, 200)}...`);

                // Add car if it has essential data (make and description are sufficient)
                if ((car.make && car.description) || (car.description && car.description.length > 10)) {
                    cars.push(car);
                    logs.push(`✅ Car ${index} added to results`);
                } else {
                    logs.push(`❌ Car ${index} skipped - insufficient data (make: "${car.make}", desc: "${car.description}", price: "${car.price_bruto}")`);
                }

            } catch (error) {
                logs.push(`Error processing car ${index}: ${error.message}`);
            }
        });

        logs.push(`🏁 Total cars extracted: ${cars.length}`);
        return { cars, logs };
    }, options);
}

module.exports = { extractCarListings };