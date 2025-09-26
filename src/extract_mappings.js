const { chromium } = require('playwright');

async function extractBrandModelMappings() {
    console.log('Extracting brand and model mappings from Carzilla.de...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Navigate to the search page
        console.log('Navigating to search page...');
        await page.goto('https://www.carzilla.de/fahrzeugsuche', { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // Extract all brands from the brand selector
        console.log('\n=== EXTRACTING BRAND MAPPINGS ===');
        const brands = await page.evaluate(() => {
            const brandSelectors = document.querySelectorAll('select');
            let brandSelect = null;

            // Find the brand selector (likely the first select with many options)
            for (const select of brandSelectors) {
                if (select.options.length > 10) { // Brand selector should have many options
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

        console.log('Brands found:', brands);

        // Now extract models for each brand
        console.log('\n=== EXTRACTING MODEL MAPPINGS ===');
        const brandModelMappings = {};

        for (const brand of brands.slice(0, 5)) { // Test with first 5 brands to avoid too long execution
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
                        // Trigger change event
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

                    // Find the model selector (usually the second select, or one that got populated)
                    for (let i = 1; i < modelSelectors.length; i++) {
                        const select = modelSelectors[i];
                        if (select.options.length > 1) { // Should have options after brand selection
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
                    console.log('Sample models:', models.slice(0, 3));
                }

            } catch (error) {
                console.log(`Error extracting models for ${brand.name}:`, error.message);
            }
        }

        // Save the mappings to a file
        const fs = require('fs');
        const mappingData = {
            timestamp: new Date().toISOString(),
            brands: brands,
            brandModelMappings: brandModelMappings
        };

        fs.writeFileSync('brand_model_mappings.json', JSON.stringify(mappingData, null, 2));
        console.log('\n=== MAPPINGS SAVED ===');
        console.log('Mappings saved to brand_model_mappings.json');

        // Create JavaScript constants for easy use
        const jsConstants = generateJSConstants(brandModelMappings);
        fs.writeFileSync('mappings_constants.js', jsConstants);
        console.log('JavaScript constants saved to mappings_constants.js');

    } catch (error) {
        console.error('Error during mapping extraction:', error);
    } finally {
        await browser.close();
    }
}

function generateJSConstants(brandModelMappings) {
    const brandMap = {};
    const modelMap = {};

    Object.entries(brandModelMappings).forEach(([brandName, data]) => {
        brandMap[brandName] = data.brandId;

        if (data.models.length > 0) {
            modelMap[brandName] = {};
            data.models.forEach(model => {
                modelMap[brandName][model.name] = model.id;
            });
        }
    });

    return `// Auto-generated brand and model mappings for Carzilla.de
// Generated on: ${new Date().toISOString()}

const BRAND_MAP = ${JSON.stringify(brandMap, null, 2)};

const MODEL_MAP = ${JSON.stringify(modelMap, null, 2)};

module.exports = {
    BRAND_MAP,
    MODEL_MAP
};
`;
}

// Run the extraction
extractBrandModelMappings().catch(console.error);