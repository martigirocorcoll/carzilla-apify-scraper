const { chromium } = require('playwright');

async function analyzeSearchParameters() {
    console.log('Analyzing Carzilla.de search parameters...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Navigate to the search page
        console.log('Navigating to search page...');
        await page.goto('https://www.carzilla.de/fahrzeugsuche', { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // Analyze all form elements and their parameters
        console.log('\n=== ANALYZING ALL SEARCH FORM ELEMENTS ===');
        const formElements = await page.evaluate(() => {
            const elements = [];

            // Get all select, input elements in the search form
            const selectors = document.querySelectorAll('select, input[type="text"], input[type="number"], input[type="checkbox"], input[type="radio"]');

            selectors.forEach((element, index) => {
                const elementData = {
                    index: index,
                    type: element.type || element.tagName.toLowerCase(),
                    name: element.name,
                    id: element.id,
                    className: element.className,
                    placeholder: element.placeholder
                };

                // For select elements, get all options
                if (element.tagName.toLowerCase() === 'select') {
                    elementData.options = [];
                    for (const option of element.options) {
                        if (option.value && option.textContent.trim()) {
                            elementData.options.push({
                                value: option.value,
                                text: option.textContent.trim()
                            });
                        }
                    }
                    elementData.optionCount = elementData.options.length;
                }

                // Try to get the label or nearby text
                const labels = document.querySelectorAll('label');
                for (const label of labels) {
                    if (label.getAttribute('for') === element.id || label.contains(element)) {
                        elementData.label = label.textContent.trim();
                        break;
                    }
                }

                // If no label found, look for nearby text
                if (!elementData.label) {
                    const parent = element.closest('.form-group, .panel-body, .col-md-3');
                    if (parent) {
                        const headings = parent.querySelectorAll('h1, h2, h3, h4, h5, label, .control-label');
                        if (headings.length > 0) {
                            elementData.nearbyText = headings[0].textContent.trim();
                        }
                    }
                }

                elements.push(elementData);
            });

            return elements;
        });

        console.log(`Found ${formElements.length} form elements:`);

        // Categorize and analyze each element
        const parameterMap = {};

        formElements.forEach((element, index) => {
            console.log(`\n[${index}] ${element.type.toUpperCase()}`);
            console.log(`  Name: ${element.name || 'N/A'}`);
            console.log(`  ID: ${element.id || 'N/A'}`);
            console.log(`  Label/Text: ${element.label || element.nearbyText || 'N/A'}`);
            console.log(`  Class: ${element.className || 'N/A'}`);

            if (element.placeholder) {
                console.log(`  Placeholder: ${element.placeholder}`);
            }

            if (element.options) {
                console.log(`  Options: ${element.optionCount} (showing first 5)`);
                element.options.slice(0, 5).forEach(opt => {
                    console.log(`    ${opt.value} → ${opt.text}`);
                });
            }

            // Try to map to importocoches.com parameters
            const label = (element.label || element.nearbyText || '').toLowerCase();
            const placeholder = (element.placeholder || '').toLowerCase();

            if (label.includes('marke') || label.includes('brand')) {
                parameterMap.make = { element: element, mapping: 'brand selection' };
            } else if (label.includes('modell') || label.includes('model')) {
                parameterMap.model = { element: element, mapping: 'model selection' };
            } else if (label.includes('preis') || label.includes('price')) {
                if (label.includes('von') || label.includes('min')) {
                    parameterMap.price_min = { element: element, mapping: 'minimum price' };
                } else if (label.includes('bis') || label.includes('max')) {
                    parameterMap.price_max = { element: element, mapping: 'maximum price' };
                }
            } else if (label.includes('kilometer') || label.includes('km') || label.includes('laufleistung')) {
                if (label.includes('bis') || label.includes('max')) {
                    parameterMap.mileage_max = { element: element, mapping: 'maximum mileage' };
                }
            } else if (label.includes('erstzulassung') || label.includes('jahr') || label.includes('ez')) {
                if (label.includes('von') || label.includes('ab')) {
                    parameterMap.first_registration_date = { element: element, mapping: 'minimum year' };
                }
            } else if (label.includes('kraftstoff') || label.includes('fuel') || label.includes('antrieb')) {
                parameterMap.fuel = { element: element, mapping: 'fuel type' };
            } else if (label.includes('getriebe') || label.includes('schaltung') || label.includes('transmission')) {
                parameterMap.transmission = { element: element, mapping: 'transmission type' };
            } else if (label.includes('leistung') || label.includes('ps') || label.includes('kw') || label.includes('power')) {
                parameterMap.power = { element: element, mapping: 'power/horsepower' };
            } else if (label.includes('allrad') || label.includes('4x4') || label.includes('4wd')) {
                parameterMap.fourwheeldrive = { element: element, mapping: '4x4 drive' };
            }
        });

        console.log('\n=== PARAMETER MAPPING RESULTS ===');
        Object.entries(parameterMap).forEach(([param, data]) => {
            console.log(`${param}: ${data.mapping}`);
            console.log(`  Element: ${data.element.type} with ${data.element.optionCount || 0} options`);
        });

        // Test some parameter combinations by building URLs
        console.log('\n=== TESTING PARAMETER COMBINATIONS ===');

        // Test price range
        await testParameterCombination(page, 'BMW with price range',
            'https://carzilla.de/Fahrzeuge/Fahrzeugliste?m=9&price_min=20000&price_max=50000');

        // Test mileage
        await testParameterCombination(page, 'BMW with mileage limit',
            'https://carzilla.de/Fahrzeuge/Fahrzeugliste?m=9&mileage_max=100000');

        // Test year
        await testParameterCombination(page, 'BMW from 2020',
            'https://carzilla.de/Fahrzeuge/Fahrzeugliste?m=9&year_from=2020');

        // Save analysis results
        const fs = require('fs');
        fs.writeFileSync('search_parameters_analysis.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            formElements: formElements,
            parameterMap: parameterMap
        }, null, 2));

        console.log('\n✓ Analysis saved to search_parameters_analysis.json');

    } catch (error) {
        console.error('Error during parameter analysis:', error);
    } finally {
        await browser.close();
    }
}

async function testParameterCombination(page, description, url) {
    try {
        console.log(`\nTesting: ${description}`);
        console.log(`URL: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(2000);

        const title = await page.title();
        const resultCount = await page.locator('.panel.panel-default').count();

        console.log(`  Results: ${resultCount} cars found`);
        console.log(`  Page title: ${title}`);

        return { description, url, resultCount, title };
    } catch (error) {
        console.log(`  Error: ${error.message}`);
        return { description, url, error: error.message };
    }
}

// Run the parameter analysis
analyzeSearchParameters().catch(console.error);