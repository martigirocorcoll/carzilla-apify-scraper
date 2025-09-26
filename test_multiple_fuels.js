// Test script for multiple fuel types functionality
const { buildCarzillaURL, getCheckboxFilters } = require('./src/parameter_mapping.js');

console.log('🧪 Testing multiple fuel types functionality...\n');

// Test case 1: Single fuel type
const testParams1 = {
    "make": "BMW",
    "model": "X5",
    "fuel": "Diesel"
};

console.log('Test 1 - Single fuel type (Diesel):');
console.log('Input:', JSON.stringify(testParams1, null, 2));
const url1 = buildCarzillaURL(testParams1);
console.log('Generated URL:', url1);
console.log('Checkbox filters:', getCheckboxFilters(testParams1));
console.log('\n---\n');

// Test case 2: Multiple fuel types as array
const testParams2 = {
    "make": "BMW",
    "model": "X5",
    "fuel": ["Híbrido (gasolina/eléctrico)", "Híbrido (diésel/eléctrico)", "Eléctrico"]
};

console.log('Test 2 - Multiple fuel types (Hybrids + Electric):');
console.log('Input:', JSON.stringify(testParams2, null, 2));
const url2 = buildCarzillaURL(testParams2);
console.log('Generated URL:', url2);
console.log('Checkbox filters:', getCheckboxFilters(testParams2));
console.log('\n---\n');

// Test case 3: All hybrid types
const testParams3 = {
    "make": "Mercedes-Benz",
    "model": "C 300",
    "fuel": ["Hybrid", "Híbrido (gasolina/eléctrico)", "Híbrido (diésel/eléctrico)"]
};

console.log('Test 3 - All hybrid types:');
console.log('Input:', JSON.stringify(testParams3, null, 2));
const url3 = buildCarzillaURL(testParams3);
console.log('Generated URL:', url3);
console.log('Checkbox filters:', getCheckboxFilters(testParams3));

console.log('\n✅ Multiple fuel types tests completed!');