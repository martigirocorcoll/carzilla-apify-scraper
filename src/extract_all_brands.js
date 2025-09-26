const { chromium } = require('playwright');

async function extractAllRequiredBrands() {
    console.log('Extracting ALL required brand mappings from Carzilla.de...');

    // All brands from the project requirements
    const ALL_REQUIRED_BRANDS = [
        'Abarth', 'Alfa Romeo', 'Audi', 'BMW', 'Bentley', 'BYD', 'Citroen', 'Cupra', 'Dacia', 'DS',
        'Fiat', 'Ford', 'Genesis', 'Hyundai', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover',
        'Lexus', 'Lotus', 'Lucid', 'Maserati', 'Maxus', 'Mazda', 'Mercedes-Benz', 'MG', 'Mini',
        'Mitsubishi', 'Nio', 'Nissan', 'Opel', 'Peugeot', 'Polestar', 'Porsche', 'Renault',
        'Rolls Royce', 'Seat', 'Skoda', 'Smart', 'Ssangyong', 'Subaru', 'Suzuki', 'Tesla',
        'Toyota', 'VW', 'Volvo', 'XPENG'
    ];

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('Navigating to search page...');
        await page.goto('https://www.carzilla.de/fahrzeugsuche', { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // Extract all available brands from the site
        const allAvailableBrands = await page.evaluate(() => {
            const brandSelectors = document.querySelectorAll('select');
            let brandSelect = null;

            for (const select of brandSelectors) {
                if (select.options.length > 10) {
                    brandSelect = select;
                    break;
                }
            }

            if (!brandSelect) return [];

            const brands = [];
            for (const option of brandSelect.options) {
                if (option.value && option.textContent.trim()) {
                    brands.push({
                        id: option.value,
                        name: option.textContent.trim()
                    });
                }
            }

            return brands;
        });

        console.log(`Found ${allAvailableBrands.length} total brands on site`);

        // Map required brands to available brands (handle name variations)
        const foundBrands = [];
        const notFoundBrands = [];

        for (const requiredBrand of ALL_REQUIRED_BRANDS) {
            const found = allAvailableBrands.find(availableBrand => {
                const available = availableBrand.name.toLowerCase();
                const required = requiredBrand.toLowerCase();

                // Handle name variations
                if (required === 'mini' && available === 'mini') return true;
                if (required === 'vw' && available === 'volkswagen') return true;
                if (required === 'rolls royce' && available.includes('rolls')) return true;
                if (required === 'ssangyong' && available === 'ssangyong') return true;

                return available === required;
            });

            if (found) {
                foundBrands.push(found);
            } else {
                notFoundBrands.push(requiredBrand);
            }
        }

        console.log(`\nMatched ${foundBrands.length} brands from requirements`);
        console.log('Not found on site:', notFoundBrands);

        // Extract models for all found brands
        const brandModelMappings = {};
        let processedCount = 0;

        for (const brand of foundBrands) {
            processedCount++;
            console.log(`\n[${processedCount}/${foundBrands.length}] Extracting models for ${brand.name} (ID: ${brand.id})...`);

            try {
                // Select the brand
                await page.evaluate((brandId) => {
                    const brandSelectors = document.querySelectorAll('select');
                    let brandSelect = null;

                    for (const select of brandSelectors) {
                        if (select.options.length > 10) {
                            brandSelect = select;
                            break;
                        }
                    }

                    if (brandSelect) {
                        brandSelect.value = brandId;
                        const event = new Event('change', { bubbles: true });
                        brandSelect.dispatchEvent(event);
                    }
                }, brand.id);

                // Wait for models to load
                await page.waitForTimeout(2000);

                // Extract models for this brand
                const models = await page.evaluate(() => {
                    const modelSelectors = document.querySelectorAll('select');
                    let modelSelect = null;

                    for (let i = 1; i < modelSelectors.length; i++) {
                        const select = modelSelectors[i];
                        if (select.options.length > 1) {
                            modelSelect = select;
                            break;
                        }
                    }

                    if (!modelSelect) return [];

                    const models = [];
                    for (const option of modelSelect.options) {
                        if (option.value && option.textContent.trim()) {
                            models.push({
                                id: option.value,
                                name: option.textContent.trim()
                            });
                        }
                    }

                    return models;
                });

                brandModelMappings[brand.name] = {
                    brandId: brand.id,
                    models: models
                };

                console.log(`  ✓ Found ${models.length} models`);

            } catch (error) {
                console.log(`  ✗ Error: ${error.message}`);
            }
        }

        // Generate the complete mappings file
        const fs = require('fs');
        const jsConstants = generateCompleteConstants(brandModelMappings, notFoundBrands);
        fs.writeFileSync('final_complete_mappings.js', jsConstants);

        // Also save raw data for reference
        fs.writeFileSync('all_brands_data.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            foundBrands: foundBrands,
            notFoundBrands: notFoundBrands,
            brandModelMappings: brandModelMappings
        }, null, 2));

        console.log('\n=== EXTRACTION COMPLETE ===');
        console.log('✓ Complete mappings saved to final_complete_mappings.js');
        console.log('✓ Raw data saved to all_brands_data.json');
        console.log(`✓ Successfully mapped ${foundBrands.length} brands`);
        console.log(`⚠ ${notFoundBrands.length} brands not found on site:`, notFoundBrands.join(', '));

    } catch (error) {
        console.error('Error during mapping extraction:', error);
    } finally {
        await browser.close();
    }
}

function generateCompleteConstants(brandModelMappings, notFoundBrands) {
    const brandMap = {};
    const modelMap = {};

    Object.entries(brandModelMappings).forEach(([brandName, data]) => {
        const cleanBrandId = data.brandId.replace('number:', '');
        brandMap[brandName] = cleanBrandId;

        if (data.models.length > 0) {
            modelMap[brandName] = {};
            data.models.forEach(model => {
                modelMap[brandName][model.name] = model.id;
            });
        }
    });

    return `// COMPLETE brand and model mappings for Carzilla.de scraper
// Generated on: ${new Date().toISOString()}
//
// Successfully mapped: ${Object.keys(brandMap).length} brands
// Not found on site: ${notFoundBrands.join(', ')}

const BRAND_MAP = ${JSON.stringify(brandMap, null, 4)};

const MODEL_MAP = ${JSON.stringify(modelMap, null, 4)};

// Helper function to build search URL
function buildSearchUrl({ make, model, price_max, mileage_max, first_registration_date }) {
    const brandId = BRAND_MAP[make];
    const modelId = MODEL_MAP[make] && MODEL_MAP[make][model];

    if (!brandId) {
        throw new Error(\`Brand \${make} not supported. Available brands: \${Object.keys(BRAND_MAP).join(', ')}\`);
    }

    let url = \`https://carzilla.de/Fahrzeuge/Fahrzeugliste?m=\${brandId}\`;

    if (modelId) {
        url += \`&mo=\${modelId}\`;
    }

    // Note: Additional filter parameters would need to be discovered
    // through further analysis of the search form

    return url;
}

// Fuel type mapping from Spanish to Carzilla format
const FUEL_TYPE_MAP = {
    'Gasolina': 'PETROL',
    'Diésel': 'DIESEL',
    'Gas de automoción': 'LPG',
    'Gas natural': 'CNG',
    'Eléctrico': 'ELECTRICITY',
    'Híbrido (gasolina/eléctrico)': 'HYBRID',
    'Hidrógeno': 'HYDROGENIUM',
    'Etanol (FFV,E85, etc.)': 'ETHANOL',
    'Híbrido (diésel/eléctrico)': 'HYBRID_DIESEL',
    'Otro': 'OTHER'
};

// Transmission mapping
const TRANSMISSION_MAP = {
    'Manual': 'MANUAL_GEAR',
    'Automático': 'AUTOMATIC_GEAR'
};

module.exports = {
    BRAND_MAP,
    MODEL_MAP,
    buildSearchUrl,
    FUEL_TYPE_MAP,
    TRANSMISSION_MAP
};
`;
}

// Run the comprehensive extraction
extractAllRequiredBrands().catch(console.error);