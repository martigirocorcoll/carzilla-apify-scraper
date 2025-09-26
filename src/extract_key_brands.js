const { chromium } = require('playwright');

async function extractKeyBrandMappings() {
    console.log('Extracting key brand mappings from Carzilla.de...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Focus on the key brands from the project requirements
    const KEY_BRANDS = ['BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Porsche', 'MINI', 'Tesla', 'Cupra'];

    try {
        // Navigate to the search page
        console.log('Navigating to search page...');
        await page.goto('https://www.carzilla.de/fahrzeugsuche', { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // Extract all brands first
        const allBrands = await page.evaluate(() => {
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

        // Filter to key brands only
        const keyBrands = allBrands.filter(brand =>
            KEY_BRANDS.includes(brand.name)
        );

        console.log('Key brands found:', keyBrands);

        const brandModelMappings = {};

        for (const brand of keyBrands) {
            console.log(`\nExtracting models for ${brand.name} (ID: ${brand.id})...`);

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
                await page.waitForTimeout(3000);

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

                console.log(`Found ${models.length} models for ${brand.name}`);
                if (models.length > 0) {
                    console.log('Models:', models.map(m => m.name).join(', '));
                }

            } catch (error) {
                console.log(`Error extracting models for ${brand.name}:`, error.message);
            }
        }

        // Generate the complete mappings file
        const fs = require('fs');
        const jsConstants = generateCompleteConstants(brandModelMappings);
        fs.writeFileSync('complete_mappings.js', jsConstants);
        console.log('\n=== COMPLETE MAPPINGS SAVED ===');
        console.log('Complete mappings saved to complete_mappings.js');

    } catch (error) {
        console.error('Error during mapping extraction:', error);
    } finally {
        await browser.close();
    }
}

function generateCompleteConstants(brandModelMappings) {
    const brandMap = {};
    const modelMap = {};

    Object.entries(brandModelMappings).forEach(([brandName, data]) => {
        // Clean up the brand ID format
        const cleanBrandId = data.brandId.replace('number:', '');
        brandMap[brandName] = cleanBrandId;

        if (data.models.length > 0) {
            modelMap[brandName] = {};
            data.models.forEach(model => {
                modelMap[brandName][model.name] = model.id;
            });
        }
    });

    return `// Complete brand and model mappings for Carzilla.de scraper
// Generated on: ${new Date().toISOString()}

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

module.exports = {
    BRAND_MAP,
    MODEL_MAP,
    buildSearchUrl
};
`;
}

// Run the extraction
extractKeyBrandMappings().catch(console.error);