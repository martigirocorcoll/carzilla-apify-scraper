const { buildCarzillaURL, getCheckboxFilters } = require('./src/parameter_mapping.js');

console.log('🔍 Probando manejo de 4x4 / Tracción a las 4 ruedas\n');

// Test 1: URL con 4x4 activado
const params4x4On = {
    make: 'BMW',
    model: 'X5',
    fourwheeldrive: '1'
};

console.log('📋 Test 1: 4x4 ACTIVADO (fourwheeldrive: "1")');
console.log('Input:', JSON.stringify(params4x4On, null, 2));

const url4x4On = buildCarzillaURL(params4x4On);
console.log('URL generada:', url4x4On);
console.log('✅ Contiene allrad=14:', url4x4On.includes('allrad=14'));

const filters4x4On = getCheckboxFilters(params4x4On);
console.log('Filtros checkbox:', JSON.stringify(filters4x4On, null, 2));

console.log('\n' + '-'.repeat(60) + '\n');

// Test 2: URL sin 4x4
const params4x4Off = {
    make: 'BMW',
    model: 'X5',
    fourwheeldrive: '0'
};

console.log('📋 Test 2: 4x4 DESACTIVADO (fourwheeldrive: "0")');
console.log('Input:', JSON.stringify(params4x4Off, null, 2));

const url4x4Off = buildCarzillaURL(params4x4Off);
console.log('URL generada:', url4x4Off);
console.log('❌ NO contiene allrad=14:', !url4x4Off.includes('allrad=14'));

const filters4x4Off = getCheckboxFilters(params4x4Off);
console.log('Filtros checkbox:', JSON.stringify(filters4x4Off, null, 2));

console.log('\n' + '-'.repeat(60) + '\n');

// Test 3: Sin parámetro 4x4
const paramsNo4x4 = {
    make: 'BMW',
    model: 'X5'
};

console.log('📋 Test 3: SIN PARÁMETRO 4x4 (fourwheeldrive: undefined)');
console.log('Input:', JSON.stringify(paramsNo4x4, null, 2));

const urlNo4x4 = buildCarzillaURL(paramsNo4x4);
console.log('URL generada:', urlNo4x4);
console.log('❌ NO contiene allrad=14:', !urlNo4x4.includes('allrad=14'));

const filtersNo4x4 = getCheckboxFilters(paramsNo4x4);
console.log('Filtros checkbox:', JSON.stringify(filtersNo4x4, null, 2));

console.log('\n📊 RESUMEN:');
console.log('✅ fourwheeldrive: "1" → Agrega &allrad=14 a URL y filtro checkbox');
console.log('❌ fourwheeldrive: "0" → NO agrega filtro 4x4');
console.log('❌ fourwheeldrive: undefined → NO agrega filtro 4x4');

console.log('\n🔧 IMPLEMENTACIÓN EN CARZILLA.DE:');
console.log('- Checkbox ID: "14"');
console.log('- Label: "Allrad" (alemán para tracción a las 4 ruedas)');
console.log('- URL parameter: &allrad=14');
console.log('- Se aplica como checkbox durante el scraping');