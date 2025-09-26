// Simple debug test to check what's happening
const { buildCarzillaURL, getCheckboxFilters } = require('./src/parameter_mapping.js');

// Test with simple BMW search
const testParams = {
    "make": "BMW",
    "model": "X5"
};

console.log('🧪 Debug test - Simple BMW X5 search');
console.log('Input:', JSON.stringify(testParams, null, 2));

const url = buildCarzillaURL(testParams);
console.log('Generated URL:', url);
console.log('Checkbox filters:', getCheckboxFilters(testParams));

// Test the URL manually
console.log('\n🔗 You can test this URL manually in browser:');
console.log(url);

// Also test with minimal filters
const testParamsWithFilters = {
    "make": "BMW",
    "price_max": "50000"
};

console.log('\n---\nTest with just price filter:');
const url2 = buildCarzillaURL(testParamsWithFilters);
console.log('URL with price filter:', url2);