// Test script for filter functionality
const { buildCarzillaURL, getCheckboxFilters } = require('./src/parameter_mapping.js');

console.log('🧪 Testing filter functionality...\n');

// Test case 1: Full filter example from your request
const testParams1 = {
    "make": "BMW",
    "model": "X5",
    "price_min": "20000",
    "price_max": "60000",
    "mileage_max": "120000",
    "first_registration_date": "2018",
    "fuel": "Diesel",
    "potencia": "180",
    "transmision": "Automatik",
    "fourwheeldrive": "1"
};

console.log('Test 1 - Full BMW X5 search with filters:');
console.log('Input:', JSON.stringify(testParams1, null, 2));
const url1 = buildCarzillaURL(testParams1);
console.log('Generated URL:', url1);
console.log('Checkbox filters:', getCheckboxFilters(testParams1));
console.log('\n---\n');

// Test case 2: Mercedes with different filters
const testParams2 = {
    "make": "Mercedes-Benz",
    "model": "C 300",
    "price_min": "15000",
    "price_max": "45000",
    "fuel": "Híbrido (gasolina/eléctrico)",
    "transmision": "automatico",
    "potencia": "150"
};

console.log('Test 2 - Mercedes hybrid search:');
console.log('Input:', JSON.stringify(testParams2, null, 2));
const url2 = buildCarzillaURL(testParams2);
console.log('Generated URL:', url2);
console.log('Checkbox filters:', getCheckboxFilters(testParams2));
console.log('\n---\n');

// Test case 3: Basic search without filters
const testParams3 = {
    "make": "Audi",
    "model": "A4"
};

console.log('Test 3 - Basic Audi A4 search:');
console.log('Input:', JSON.stringify(testParams3, null, 2));
const url3 = buildCarzillaURL(testParams3);
console.log('Generated URL:', url3);
console.log('Checkbox filters:', getCheckboxFilters(testParams3));

console.log('\n✅ Filter tests completed!');