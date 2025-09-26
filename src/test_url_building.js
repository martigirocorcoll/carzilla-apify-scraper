// Test URL building with the new parameters
const { buildCarzillaURL } = require('./parameter_mapping.js');

console.log('Testing URL building with new parameters...\n');

// Test cases
const testCases = [
    {
        name: 'BMW 530 basic search',
        params: { make: 'BMW', model: '530' }
    },
    {
        name: 'BMW with price range',
        params: { make: 'BMW', price_min: '20000', price_max: '50000' }
    },
    {
        name: 'Mercedes with all filters',
        params: {
            make: 'Mercedes-Benz',
            model: 'C 300',
            price_max: '40000',
            mileage_max: '80000',
            first_registration_date: '2020',
            fuel: 'Híbrido (gasolina/eléctrico)',
            transmision: 'Automático',
            fourwheeldrive: '1'
        }
    },
    {
        name: 'Unsupported brand (should return null)',
        params: { make: 'Lucid', model: 'Air' }
    }
];

testCases.forEach(testCase => {
    console.log(`🧪 ${testCase.name}:`);
    console.log('   Input:', JSON.stringify(testCase.params, null, 6));

    const url = buildCarzillaURL(testCase.params);

    if (url) {
        console.log('   URL:', url);
        console.log('   ✅ Contains rp=20:', url.includes('rp=20'));
        console.log('   ✅ Contains sorting:', url.includes('sf=prices.SalePrice.value'));
    } else {
        console.log('   Result: null (unsupported brand)');
    }

    console.log('');
});

console.log('URL testing completed! ✅');