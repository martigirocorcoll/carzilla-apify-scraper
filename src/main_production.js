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
                    // Clean up title text more aggressively
                    let fullTitle = titleElement.textContent || titleElement.innerText || '';
                    fullTitle = fullTitle.replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\\s+/g, ' ').trim();

                    if (fullTitle) {
                        car.make = opts.make || 'Audi';  // Use passed make
                        car.description = fullTitle;     // Full title as description
                        logs.push(`🚗 Car ${index}: Cleaned title "${fullTitle}"`);
                    } else {
                        logs.push(`❌ Car ${index}: Empty title after cleaning`);
                    }
                } else {
                    logs.push(`❌ Car ${index}: No title element found`);
                    // Try to find ANY text content in the element
                    const anyText = element.textContent || element.innerText || '';
                    if (anyText.trim().length > 10) {
                        car.make = opts.make || 'Audi';
                        car.description = anyText.trim().slice(0, 100);
                        logs.push(`🔄 Car ${index}: Used element text as description`);
                    }
                }

                // EXPERT DATA EXTRACTION STRATEGY
                logs.push(`🔬 Car ${index}: Starting expert extraction analysis`);

                // Strategy 1: innerHTML analysis (raw HTML content)
                const innerHTML = element.innerHTML || '';
                logs.push(`📋 Car ${index}: innerHTML length: ${innerHTML.length}`);

                // Strategy 2: Visible text extraction (ignore hidden elements)
                const visibleText = Array.from(element.querySelectorAll('*'))
                    .filter(el => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                    })
                    .map(el => el.textContent?.trim())
                    .filter(text => text && text.length > 0)
                    .join(' ');

                logs.push(`👁️ Car ${index}: Visible text length: ${visibleText.length}, sample: "${visibleText.slice(0, 100)}"`);

                // Strategy 3: Price extraction from multiple sources
                let foundPrice = null;
                const priceSelectors = [
                    '[class*="price"]', '[class*="preis"]', '[class*="cost"]', '[class*="amount"]',
                    '[data-price]', '[data-cost]', '.price', '.preis', '.betrag', '.kosten'
                ];

                // Try specific price elements first
                for (const selector of priceSelectors) {
                    const priceElements = element.querySelectorAll(selector);
                    for (const priceEl of priceElements) {
                        const priceText = priceEl.textContent || priceEl.getAttribute('data-price') || '';
                        const priceMatch = priceText.match(/(\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{2})?)\\s*€?/);
                        if (priceMatch) {
                            const cleanPrice = priceMatch[1].replace(/[.,]/g, '');
                            const price = parseInt(cleanPrice);
                            if (price > 1000 && price < 500000) {
                                foundPrice = price;
                                logs.push(`💰 Car ${index}: Price found via selector "${selector}": ${foundPrice}€`);
                                break;
                            }
                        }
                    }
                    if (foundPrice) break;
                }

                // Strategy 4: Pattern matching in innerHTML if no specific elements found
                if (!foundPrice) {
                    const htmlPricePatterns = [
                        />\\s*(\\d{1,3}[.,]\\d{3})\\s*€/g,         // >34.440 €
                        /€\\s*(\\d{1,3}[.,]\\d{3})\\s*</g,         // € 34.440 <
                        /Preis[^>]*>(\\d{1,3}[.,]\\d{3})/gi,       // Preis>34440
                        /price[^>]*>(\\d{1,3}[.,]\\d{3})/gi        // price>34440
                    ];

                    for (let i = 0; i < htmlPricePatterns.length; i++) {
                        const pattern = htmlPricePatterns[i];
                        const match = innerHTML.match(pattern);
                        if (match) {
                            const cleanPrice = match[1].replace(/[.,]/g, '');
                            const price = parseInt(cleanPrice);
                            if (price > 1000 && price < 500000) {
                                foundPrice = price;
                                logs.push(`💰 Car ${index}: HTML pattern ${i} found price: ${foundPrice}€`);
                                break;
                            }
                        }
                    }
                }

                // Strategy 5: JSON/structured data extraction
                if (!foundPrice) {
                    const scriptTags = element.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]');
                    for (const script of scriptTags) {
                        try {
                            const jsonData = JSON.parse(script.textContent);
                            if (jsonData.price || jsonData.offers?.price) {
                                const price = parseInt(jsonData.price || jsonData.offers.price);
                                if (price > 1000) {
                                    foundPrice = price;
                                    logs.push(`💰 Car ${index}: JSON data found price: ${foundPrice}€`);
                                    break;
                                }
                            }
                        } catch (e) {
                            // Ignore JSON parse errors
                        }
                    }
                }

                car.price_bruto = foundPrice ? foundPrice.toString() : "0";
                if (!foundPrice) {
                    logs.push(`❌ Car ${index}: NO PRICE after all strategies. Visible text: "${visibleText.slice(0, 200)}"`);
                }

                // EXPERT MILEAGE EXTRACTION
                let foundMileage = null;
                const mileagePatterns = [
                    /(\\d{1,3}[.,]?\\d{3})\\s*km/gi,           // 45.000 km, 45,000 km
                    /(\\d{4,6})\\s*km/gi,                      // 45000 km
                    /Kilometerstand[^>]*>(\\d{1,3}[.,]?\\d{3})/gi, // Kilometerstand>45000
                    /km[^>]*>(\\d{1,3}[.,]?\\d{3})/gi          // km>45000
                ];

                // Try visible text first
                for (const pattern of mileagePatterns) {
                    const match = visibleText.match(pattern);
                    if (match) {
                        const mileage = parseInt(match[1].replace(/[.,]/g, ''));
                        if (mileage > 0 && mileage < 1000000) {
                            foundMileage = mileage;
                            logs.push(`🛣️ Car ${index}: Mileage found in visible text: ${foundMileage}km`);
                            break;
                        }
                    }
                }

                // Try innerHTML if not found
                if (!foundMileage) {
                    for (const pattern of mileagePatterns) {
                        const match = innerHTML.match(pattern);
                        if (match) {
                            const mileage = parseInt(match[1].replace(/[.,]/g, ''));
                            if (mileage > 0 && mileage < 1000000) {
                                foundMileage = mileage;
                                logs.push(`🛣️ Car ${index}: Mileage found in HTML: ${foundMileage}km`);
                                break;
                            }
                        }
                    }
                }

                if (foundMileage) {
                    car.mileage = foundMileage.toString();
                }

                // EXPERT YEAR/REGISTRATION EXTRACTION
                let foundYear = null;
                const yearPatterns = [
                    /EZ[^>]*?(\\d{2})\\/(\\d{4})/gi,           // EZ 12/2023
                    /EZ[^>]*?(\\d{4})/gi,                      // EZ 2023
                    /Erstzulassung[^>]*?(\\d{4})/gi,          // Erstzulassung 2023
                    /(\\d{2})\\/(\\d{4})/g,                   // 12/2023
                    /Jahr[^>]*?(\\d{4})/gi                    // Jahr 2023
                ];

                for (const pattern of yearPatterns) {
                    const match = (visibleText + innerHTML).match(pattern);
                    if (match) {
                        const year = match[2] || match[1]; // Take full year
                        if (year && year.length === 4 && parseInt(year) > 1990 && parseInt(year) <= 2025) {
                            foundYear = year;
                            car.first_registration = year + '-01'; // Default to January
                            logs.push(`📅 Car ${index}: Year found: ${foundYear}`);
                            break;
                        }
                    }
                }

                // EXPERT POWER EXTRACTION
                let foundPower = null;
                const powerPatterns = [
                    /(\\d{2,3})\\s*kW/gi,                     // 150 kW
                    /(\\d{2,3})\\s*PS/gi,                     // 204 PS (convert to kW)
                    /Leistung[^>]*?(\\d{2,3})\\s*kW/gi        // Leistung 150 kW
                ];

                for (const pattern of powerPatterns) {
                    const match = (visibleText + innerHTML).match(pattern);
                    if (match) {
                        let power = parseInt(match[1]);
                        // Convert PS to kW if needed (pattern contains PS)
                        if (pattern.toString().includes('PS')) {
                            power = Math.round(power * 0.735); // PS to kW conversion
                        }
                        if (power > 30 && power < 1000) {
                            foundPower = power;
                            logs.push(`⚡ Car ${index}: Power found: ${foundPower}kW`);
                            break;
                        }
                    }
                }

                if (foundPower) {
                    car.power = foundPower.toString();
                }

                // VAT extraction with multiple strategies
                car.vat = '19'; // Default
                if (visibleText.includes('MwSt. ausweisbar') || innerHTML.includes('MwSt. ausweisbar')) {
                    car.vat = '19';
                } else if (visibleText.includes('MwSt. nicht ausweisbar') || innerHTML.includes('MwSt. nicht ausweisbar')) {
                    car.vat = '0';
                }

                // EXPERT FUEL TYPE EXTRACTION
                const searchText = (visibleText + innerHTML).toLowerCase();
                const fuelMap = {
                    'benzin': 'PETROL', 'petrol': 'PETROL', 'gasoline': 'PETROL',
                    'diesel': 'DIESEL', 'tdi': 'DIESEL', 'cdi': 'DIESEL',
                    'elektro': 'ELECTRICITY', 'electric': 'ELECTRICITY', 'ev': 'ELECTRICITY',
                    'hybrid': 'HYBRID', 'plug-in': 'HYBRID', 'tfsi e': 'HYBRID',
                    'gas': 'LPG', 'lpg': 'LPG', 'autogas': 'LPG',
                    'erdgas': 'CNG', 'cng': 'CNG',
                    'wasserstoff': 'HYDROGENIUM', 'hydrogen': 'HYDROGENIUM'
                };

                for (const [keyword, fuelType] of Object.entries(fuelMap)) {
                    if (searchText.includes(keyword)) {
                        car.fuel = fuelType;
                        logs.push(`⛽ Car ${index}: Fuel type found: ${fuelType} (from "${keyword}")`);
                        break;
                    }
                }

                // EXPERT TRANSMISSION EXTRACTION
                const transmissionKeywords = {
                    'automatik': 'AUTOMATIC_GEAR',
                    'automatic': 'AUTOMATIC_GEAR',
                    's tronic': 'AUTOMATIC_GEAR',
                    'tiptronic': 'SEMIAUTOMATIC_GEAR',
                    'dsg': 'AUTOMATIC_GEAR',
                    'schaltgetriebe': 'MANUAL_GEAR',
                    'manuell': 'MANUAL_GEAR',
                    'manual': 'MANUAL_GEAR'
                };

                for (const [keyword, gearType] of Object.entries(transmissionKeywords)) {
                    if (searchText.includes(keyword)) {
                        car.gearbox = gearType;
                        logs.push(`⚙️ Car ${index}: Transmission found: ${gearType} (from "${keyword}")`);
                        break;
                    }
                }

                // EXPERT COLOR EXTRACTION
                const colorKeywords = [
                    'schwarz', 'black', 'weiss', 'white', 'rot', 'red', 'blau', 'blue',
                    'grau', 'gray', 'grey', 'silber', 'silver', 'grün', 'green',
                    'gelb', 'yellow', 'orange', 'braun', 'brown', 'beige'
                ];

                for (const color of colorKeywords) {
                    if (searchText.includes(color)) {
                        car.color = color.charAt(0).toUpperCase() + color.slice(1);
                        logs.push(`🎨 Car ${index}: Color found: ${car.color}`);
                        break;
                    }
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

                // FINAL DATA SUMMARY
                logs.push(`📊 Car ${index} EXTRACTION SUMMARY:`);
                logs.push(`   Make: ${car.make || 'N/A'}`);
                logs.push(`   Description: ${car.description?.slice(0, 50) || 'N/A'}...`);
                logs.push(`   Price: ${car.price_bruto || 'N/A'}€`);
                logs.push(`   Mileage: ${car.mileage || 'N/A'}km`);
                logs.push(`   Year: ${car.first_registration || 'N/A'}`);
                logs.push(`   Power: ${car.power || 'N/A'}kW`);
                logs.push(`   Fuel: ${car.fuel || 'N/A'}`);
                logs.push(`   Transmission: ${car.gearbox || 'N/A'}`);
                logs.push(`   Color: ${car.color || 'N/A'}`);

                // Add car if it has sufficient data
                const hasEssentialData = car.description && car.description.length > 5;
                if (hasEssentialData) {
                    cars.push(car);
                    logs.push(`✅ Car ${index} ADDED TO RESULTS`);
                } else {
                    logs.push(`❌ Car ${index} REJECTED - insufficient description`);
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