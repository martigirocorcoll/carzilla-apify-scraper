const { chromium } = require('playwright');
const { buildCarzillaURL, isSearchSupported } = require('./parameter_mapping.js');
const CarzillaScraper = require('./scraper_core.js');

class TestSuite {
    constructor() {
        this.results = [];
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('🚀 Iniciando Test Suite para Carzilla.de scraper...\n');
        this.browser = await chromium.launch({ headless: false });
        this.page = await this.browser.newPage();
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
        console.log('\n✅ Test Suite completado');
        console.log(`📊 Resultados: ${this.results.filter(r => r.passed).length}/${this.results.length} tests pasaron`);

        const failed = this.results.filter(r => !r.passed);
        if (failed.length > 0) {
            console.log('\n❌ Tests fallidos:');
            failed.forEach(test => console.log(`   - ${test.name}: ${test.error}`));
        }
    }

    async runTest(name, testFn) {
        console.log(`🧪 Test: ${name}`);
        try {
            await testFn();
            this.results.push({ name, passed: true });
            console.log(`   ✅ PASÓ\n`);
        } catch (error) {
            this.results.push({ name, passed: false, error: error.message });
            console.log(`   ❌ FALLÓ: ${error.message}\n`);
        }
    }

    async runAllTests() {
        await this.init();

        // Test 1: Verificar mapeo de marcas
        await this.runTest('Mapeo de marcas populares', async () => {
            const popularBrands = ['BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Tesla'];
            popularBrands.forEach(brand => {
                const support = isSearchSupported({ make: brand });
                if (!support.supported) {
                    throw new Error(`Marca ${brand} no está soportada`);
                }
            });
        });

        // Test 2: Verificar marcas no soportadas
        await this.runTest('Marcas no soportadas devuelven 0 resultados', async () => {
            const unsupportedBrands = ['Lucid', 'Nio', 'Lotus'];
            unsupportedBrands.forEach(brand => {
                const support = isSearchSupported({ make: brand });
                if (support.supported) {
                    throw new Error(`Marca ${brand} debería NO estar soportada`);
                }
            });
        });

        // Test 3: Construcción de URLs
        await this.runTest('Construcción de URLs con parámetros', async () => {
            const testParams = {
                make: 'BMW',
                model: '530',
                price_min: '20000',
                price_max: '50000',
                mileage_max: '100000',
                first_registration_date: '2020'
            };

            const url = buildCarzillaURL(testParams);

            if (!url) throw new Error('URL no generada');
            if (!url.includes('m=9')) throw new Error('ID de BMW no encontrado');
            if (!url.includes('mo=1652')) throw new Error('ID de modelo 530 no encontrado');
            if (!url.includes('rp=20')) throw new Error('Parámetro de 20 resultados no encontrado');
            if (!url.includes('sf=prices.SalePrice.value')) throw new Error('Ordenación por precio no encontrada');
        });

        // Test 4: Navegación a Carzilla.de
        await this.runTest('Navegación básica a Carzilla.de', async () => {
            await this.page.goto('https://www.carzilla.de', {
                waitUntil: 'networkidle',
                timeout: 15000
            });

            const title = await this.page.title();
            if (!title.toLowerCase().includes('carzilla')) {
                throw new Error('Título de página no contiene Carzilla');
            }
        });

        // Test 5: Búsqueda BMW real
        await this.runTest('Búsqueda real BMW con resultados', async () => {
            const url = buildCarzillaURL({ make: 'BMW' });

            await this.page.goto(url, {
                waitUntil: 'networkidle',
                timeout: 15000
            });
            await this.page.waitForTimeout(3000);

            // Verificar que aparecen paneles de coches
            const carPanels = await this.page.locator('.panel.panel-default').count();
            if (carPanels === 0) {
                throw new Error('No se encontraron coches en la búsqueda de BMW');
            }

            console.log(`   📊 Encontrados ${carPanels} paneles de coches`);
        });

        // Test 6: Extracción de datos de coches
        await this.runTest('Extracción de datos de coches', async () => {
            const url = buildCarzillaURL({ make: 'BMW', model: '530' });

            await this.page.goto(url, {
                waitUntil: 'networkidle',
                timeout: 15000
            });
            await this.page.waitForTimeout(3000);

            const scraper = new CarzillaScraper();
            const cars = await scraper.extractCarListings(this.page, { make: 'BMW' });

            if (cars.length === 0) {
                throw new Error('No se extrajeron datos de coches');
            }

            // Verificar estructura UnifiedCar
            const firstCar = cars[0];
            const requiredFields = ['id', 'source'];
            const missingFields = requiredFields.filter(field => !firstCar[field]);

            if (missingFields.length > 0) {
                throw new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
            }

            if (firstCar.source !== 'apify') {
                throw new Error('Campo source debe ser "apify"');
            }

            console.log(`   📊 Extraídos ${cars.length} coches`);
            console.log(`   📝 Primer coche: ${firstCar.make} ${firstCar.description || 'N/A'}`);
        });

        // Test 7: Manejo de parámetros de combustible
        await this.runTest('Filtros de combustible', async () => {
            const fuelTypes = ['Gasolina', 'Diésel', 'Eléctrico', 'Híbrido (gasolina/eléctrico)'];

            for (const fuel of fuelTypes) {
                const url = buildCarzillaURL({ make: 'BMW', fuel });
                if (!url) {
                    throw new Error(`No se pudo construir URL para combustible: ${fuel}`);
                }
            }
        });

        // Test 8: Manejo de transmisión
        await this.runTest('Filtros de transmisión', async () => {
            const transmissions = ['Manual', 'Automático'];

            for (const transmission of transmissions) {
                const url = buildCarzillaURL({ make: 'BMW', transmision: transmission });
                if (!url) {
                    throw new Error(`No se pudo construir URL para transmisión: ${transmission}`);
                }
            }
        });

        // Test 9: Límites de tiempo
        await this.runTest('Respuesta dentro del límite de tiempo', async () => {
            const startTime = Date.now();
            const url = buildCarzillaURL({ make: 'Mercedes-Benz' });

            await this.page.goto(url, {
                waitUntil: 'networkidle',
                timeout: 20000
            });

            const elapsed = Date.now() - startTime;
            console.log(`   ⏱️ Tiempo de respuesta: ${elapsed}ms`);

            if (elapsed > 20000) {
                throw new Error(`Tiempo de respuesta excede 20 segundos: ${elapsed}ms`);
            }
        });

        // Test 10: Verificación de URLs de WhatsApp
        await this.runTest('URLs de contacto WhatsApp', async () => {
            const url = buildCarzillaURL({ make: 'BMW' });

            await this.page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
            await this.page.waitForTimeout(2000);

            const scraper = new CarzillaScraper();
            const cars = await scraper.extractCarListings(this.page, { make: 'BMW' });

            if (cars.length === 0) {
                throw new Error('No hay coches para verificar URLs de WhatsApp');
            }

            const firstCar = cars[0];
            if (!firstCar.detail_url) {
                throw new Error('No se generó URL de contacto');
            }

            if (!firstCar.detail_url.includes('wa.me')) {
                throw new Error('URL de contacto no es de WhatsApp');
            }

            if (!firstCar.detail_url.includes('34621339515')) {
                throw new Error('Número de WhatsApp incorrecto');
            }
        });

        await this.cleanup();
    }
}

// Ejecutar tests si se llama directamente
if (require.main === module) {
    const testSuite = new TestSuite();
    testSuite.runAllTests().catch(console.error);
}

module.exports = TestSuite;