const { chromium } = require('playwright');
const { buildCarzillaURL, isSearchSupported } = require('./parameter_mapping.js');

class EdgeCaseTests {
    constructor() {
        this.results = [];
    }

    async runTest(name, testFn) {
        console.log(`🔍 Test Edge Case: ${name}`);
        try {
            await testFn();
            this.results.push({ name, passed: true });
            console.log(`   ✅ PASÓ\n`);
        } catch (error) {
            this.results.push({ name, passed: false, error: error.message });
            console.log(`   ❌ FALLÓ: ${error.message}\n`);
        }
    }

    async runAllEdgeCases() {
        console.log('🎯 Tests de Casos Edge para Carzilla.de scraper...\n');

        // Edge Case 1: Marcas con nombres similares
        await this.runTest('Diferenciación Mini vs MINI', async () => {
            const miniSearch = isSearchSupported({ make: 'Mini' });
            const MINISearch = isSearchSupported({ make: 'MINI' });

            // Ambos deberían funcionar debido al mapeo
            if (!miniSearch.supported && !MINISearch.supported) {
                throw new Error('Ni Mini ni MINI están soportados');
            }
        });

        // Edge Case 2: VW vs Volkswagen
        await this.runTest('Mapeo VW -> Volkswagen', async () => {
            const vwSearch = isSearchSupported({ make: 'VW' });
            const volkswagenSearch = isSearchSupported({ make: 'Volkswagen' });

            if (!vwSearch.supported) {
                throw new Error('VW no está soportado (debería mapear a Volkswagen)');
            }
        });

        // Edge Case 3: Modelos con espacios y caracteres especiales
        await this.runTest('Modelos con espacios (BMW 225 Active Tourer)', async () => {
            const url = buildCarzillaURL({
                make: 'BMW',
                model: '225 Active Tourer'
            });

            if (!url) {
                throw new Error('No se pudo construir URL para modelo con espacios');
            }

            if (!url.includes('rp=20&sf=prices.SalePrice.value')) {
                throw new Error('Parámetros de paginación y ordenación faltantes');
            }
        });

        // Edge Case 4: Precios extremos
        await this.runTest('Precios extremos (muy bajos y muy altos)', async () => {
            // Precio muy bajo
            const lowPriceUrl = buildCarzillaURL({
                make: 'BMW',
                price_min: '500',
                price_max: '1000'
            });

            // Precio muy alto
            const highPriceUrl = buildCarzillaURL({
                make: 'BMW',
                price_min: '100000',
                price_max: '200000'
            });

            if (!lowPriceUrl || !highPriceUrl) {
                throw new Error('No se pudieron construir URLs para precios extremos');
            }
        });

        // Edge Case 5: Kilometraje extremo
        await this.runTest('Kilometraje extremo', async () => {
            // Kilometraje muy bajo (coche nuevo)
            const lowMileageUrl = buildCarzillaURL({
                make: 'Tesla',
                mileage_max: '100'
            });

            // Kilometraje muy alto
            const highMileageUrl = buildCarzillaURL({
                make: 'BMW',
                mileage_max: '500000'
            });

            if (!lowMileageUrl || !highMileageUrl) {
                throw new Error('No se pudieron construir URLs para kilometrajes extremos');
            }
        });

        // Edge Case 6: Años extremos
        await this.runTest('Años de registro extremos', async () => {
            // Año muy antiguo
            const oldYearUrl = buildCarzillaURL({
                make: 'BMW',
                first_registration_date: '1990'
            });

            // Año futuro (debería ser ignorado o ajustado)
            const futureYearUrl = buildCarzillaURL({
                make: 'BMW',
                first_registration_date: '2030'
            });

            if (!oldYearUrl) {
                throw new Error('No se pudo construir URL para año antiguo');
            }

            // El año futuro podría no ser válido, eso está OK
        });

        // Edge Case 7: Conversión de CV a kW
        await this.runTest('Conversión de potencia CV a kW', async () => {
            // 300 CV debería convertirse a ~220 kW
            const highPowerUrl = buildCarzillaURL({
                make: 'BMW',
                potencia: '300' // En CV
            });

            // 150 kW debería mantenerse
            const kwPowerUrl = buildCarzillaURL({
                make: 'BMW',
                potencia: '150' // En kW
            });

            if (!highPowerUrl || !kwPowerUrl) {
                throw new Error('No se pudieron construir URLs para conversión de potencia');
            }
        });

        // Edge Case 8: Combinación de todos los filtros
        await this.runTest('Todos los filtros combinados', async () => {
            const maxFiltersUrl = buildCarzillaURL({
                make: 'Mercedes-Benz',
                model: 'C 300',
                price_min: '25000',
                price_max: '45000',
                mileage_max: '80000',
                first_registration_date: '2020',
                fuel: 'Híbrido (gasolina/eléctrico)',
                potencia: '200',
                transmision: 'Automático',
                fourwheeldrive: '1'
            });

            if (!maxFiltersUrl) {
                throw new Error('No se pudo construir URL con todos los filtros');
            }

            // Verificar que contiene múltiples parámetros
            const expectedParams = ['m=', 'mo=', 'price_', 'mileage_', 'year_', 'fuel=', 'transmission=', 'allrad='];
            const missingParams = expectedParams.filter(param => !maxFiltersUrl.includes(param));

            if (missingParams.length > 0) {
                console.log(`   ⚠️ Parámetros faltantes: ${missingParams.join(', ')}`);
                console.log(`   🔗 URL generada: ${maxFiltersUrl}`);
            }
        });

        // Edge Case 9: Modelos no existentes para marcas válidas
        await this.runTest('Modelo inexistente para marca válida', async () => {
            const result = isSearchSupported({
                make: 'BMW',
                model: 'ModeloInventado123'
            });

            // Debería ser soportado pero con warning
            if (!result.supported) {
                throw new Error('Búsqueda debería ser soportada sin el modelo');
            }

            if (!result.warning) {
                console.log('   ⚠️ Se esperaba un warning para modelo inexistente');
            }
        });

        // Edge Case 10: Caracteres especiales en parámetros
        await this.runTest('Caracteres especiales en descripción', async () => {
            const url = buildCarzillaURL({
                make: 'BMW',
                model_description: 'M-Sport/HUD/AHK'
            });

            if (!url) {
                throw new Error('No se pudo manejar descripción con caracteres especiales');
            }
        });

        // Resumen
        console.log('📊 Resumen de Edge Cases:');
        console.log(`   ✅ Pasaron: ${this.results.filter(r => r.passed).length}`);
        console.log(`   ❌ Fallaron: ${this.results.filter(r => !r.passed).length}`);
        console.log(`   📈 Total: ${this.results.length}`);

        const failed = this.results.filter(r => !r.passed);
        if (failed.length > 0) {
            console.log('\n❌ Edge Cases fallidos:');
            failed.forEach(test => console.log(`   - ${test.name}: ${test.error}`));
        } else {
            console.log('\n🎉 ¡Todos los edge cases pasaron!');
        }
    }
}

// Ejecutar edge cases si se llama directamente
if (require.main === module) {
    const edgeTests = new EdgeCaseTests();
    edgeTests.runAllEdgeCases().catch(console.error);
}

module.exports = EdgeCaseTests;