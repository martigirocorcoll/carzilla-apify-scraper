// Test script for filter functionality
const { buildCarzillaURL, getCheckboxFilters } = require('./src/parameter_mapping.js');
const { mapBrandName, mapModelName } = require('./mapping_layer.js');

function parseUrl(url) {
    const urlObj = new URL(url);
    const filters = {};
    urlObj.searchParams.forEach((value, key) => {
        if (!filters[key]) filters[key] = [];
        filters[key].push(value);
    });
    return filters;
}

function printFilters(filters) {
    const filterNames = {
        'm': 'Brand ID',
        'mo': 'Model ID',
        'pf': 'Price from (€)',
        'pt': 'Price to (€)',
        'kt': 'Mileage to (km)',
        'ryfrom': 'Year from',
        'kwf': 'Power from (kW)',
        'mt': 'Fuel type',
        'f[]': 'Checkboxes',
        'rp': 'Results per page',
        'sf': 'Sort by'
    };

    console.log('   📊 Applied filters:');
    Object.entries(filters).forEach(([key, values]) => {
        console.log(`      ${filterNames[key] || key}: ${values.join(', ')}`);
    });
}

console.log('🧪 Testing filter functionality...\n');
console.log('='.repeat(80));

// Test case 1: Full filter example
const testParams1 = {
    "make": "BMW",
    "model": "320",
    "price_min": "15000",
    "price_max": "50000",
    "mileage_max": "100000",
    "first_registration_date": "2020",
    "fuel": "Híbrido (gasolina/eléctrico)",
    "potencia": "147",
    "transmision": "AUTOMATIC_GEAR",
    "fourwheeldrive": "1"
};

console.log('\n1️⃣  Full BMW 320 search with ALL filters:');
console.log('   Input:', JSON.stringify(testParams1, null, 2));
const mappedMake1 = mapBrandName(testParams1.make);
const mappedModel1 = mapModelName(testParams1.make, testParams1.model);
console.log(`   Mapped: ${mappedMake1} ${mappedModel1}`);
const url1 = buildCarzillaURL({ ...testParams1, make: mappedMake1, model: mappedModel1 });
console.log('   URL:', url1);
printFilters(parseUrl(url1));
console.log('   Checkbox filters:', getCheckboxFilters(testParams1));

// Test case 2: Price range only
const testParams2 = {
    "make": "Audi",
    "model": "A3",
    "price_min": "10000",
    "price_max": "25000"
};

console.log('\n2️⃣  Audi A3 with price range:');
console.log('   Input:', JSON.stringify(testParams2, null, 2));
const mappedMake2 = mapBrandName(testParams2.make);
const mappedModel2 = mapModelName(testParams2.make, testParams2.model);
const url2 = buildCarzillaURL({ ...testParams2, make: mappedMake2, model: mappedModel2 });
console.log('   URL:', url2);
printFilters(parseUrl(url2));

// Test case 3: Fuel type filters
const testParams3 = {
    "make": "VW",
    "model": "Golf",
    "fuel": "Gasolina"
};

console.log('\n3️⃣  VW Golf with fuel filter (Gasolina):');
console.log('   Input:', JSON.stringify(testParams3, null, 2));
const mappedMake3 = mapBrandName(testParams3.make);
const mappedModel3 = mapModelName(testParams3.make, testParams3.model);
const url3 = buildCarzillaURL({ ...testParams3, make: mappedMake3, model: mappedModel3 });
console.log('   URL:', url3);
printFilters(parseUrl(url3));

// Test case 4: Electric cars
const testParams4 = {
    "make": "Tesla",
    "model": "Model 3",
    "fuel": "Eléctrico"
};

console.log('\n4️⃣  Tesla Model 3 electric:');
console.log('   Input:', JSON.stringify(testParams4, null, 2));
const mappedMake4 = mapBrandName(testParams4.make);
const mappedModel4 = mapModelName(testParams4.make, testParams4.model);
const url4 = buildCarzillaURL({ ...testParams4, make: mappedMake4, model: mappedModel4 });
console.log('   URL:', url4);
printFilters(parseUrl(url4));

// Test case 5: Transmission filter
const testParams5 = {
    "make": "Mercedes-Benz",
    "model": "C 300",
    "transmision": "AUTOMATIC_GEAR"
};

console.log('\n5️⃣  Mercedes C300 automatic transmission:');
console.log('   Input:', JSON.stringify(testParams5, null, 2));
const mappedMake5 = mapBrandName(testParams5.make);
const mappedModel5 = mapModelName(testParams5.make, testParams5.model);
const url5 = buildCarzillaURL({ ...testParams5, make: mappedMake5, model: mappedModel5 });
console.log('   URL:', url5);
printFilters(parseUrl(url5));
console.log('   Checkbox filters:', getCheckboxFilters(testParams5));

// Test case 6: 4x4 filter
const testParams6 = {
    "make": "Audi",
    "model": "Q5",
    "fourwheeldrive": "1"
};

console.log('\n6️⃣  Audi Q5 with 4x4:');
console.log('   Input:', JSON.stringify(testParams6, null, 2));
const mappedMake6 = mapBrandName(testParams6.make);
const mappedModel6 = mapModelName(testParams6.make, testParams6.model);
const url6 = buildCarzillaURL({ ...testParams6, make: mappedMake6, model: mappedModel6 });
console.log('   URL:', url6);
printFilters(parseUrl(url6));
console.log('   Checkbox filters:', getCheckboxFilters(testParams6));

// Test case 7: No fuel type specified (should default to electric + hybrid)
const testParams7 = {
    "make": "BMW",
    "model": "320"
};

console.log('\n7️⃣  BMW 320 without fuel filter (should default to electric+hybrid):');
console.log('   Input:', JSON.stringify(testParams7, null, 2));
const mappedMake7 = mapBrandName(testParams7.make);
const mappedModel7 = mapModelName(testParams7.make, testParams7.model);
const url7 = buildCarzillaURL({ ...testParams7, make: mappedMake7, model: mappedModel7 });
console.log('   URL:', url7);
printFilters(parseUrl(url7));

console.log('\n' + '='.repeat(80));
console.log('✅ Filter tests completed!\n');