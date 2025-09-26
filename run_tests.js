#!/usr/bin/env node

const TestSuite = require('./src/test_suite.js');
const EdgeCaseTests = require('./src/test_edge_cases.js');
const { testFullIntegration } = require('./src/test_integration.js');

async function runAllTests() {
    console.log('🚀 EJECUTANDO SUITE COMPLETA DE TESTS PARA CARZILLA.DE SCRAPER');
    console.log('=' .repeat(70));
    console.log('📋 Tests incluidos:');
    console.log('   1. 🧪 Tests básicos de funcionalidad');
    console.log('   2. 🔍 Tests de casos edge');
    console.log('   3. 🔄 Tests de integración completa');
    console.log('   4. 🌐 Tests con navegador real (opcional)');
    console.log('=' .repeat(70) + '\n');

    const results = {
        basic: { passed: 0, total: 0 },
        edge: { passed: 0, total: 0 },
        integration: { passed: 0, total: 0 },
        browser: { passed: 0, total: 0 }
    };

    try {
        // 1. Tests básicos (sin navegador)
        console.log('🟦 FASE 1: TESTS BÁSICOS DE FUNCIONALIDAD');
        console.log('-'.repeat(50));

        const edgeTests = new EdgeCaseTests();
        await edgeTests.runAllEdgeCases();

        results.edge.passed = edgeTests.results.filter(r => r.passed).length;
        results.edge.total = edgeTests.results.length;

        console.log('\n');

        // 2. Tests de integración (simulados)
        console.log('🟨 FASE 2: TESTS DE INTEGRACIÓN');
        console.log('-'.repeat(50));

        const integrationPassed = await testFullIntegration();
        results.integration.passed = integrationPassed ? 1 : 0;
        results.integration.total = 1;

        console.log('\n');

        // 3. Tests con navegador real (opcional)
        console.log('🟩 FASE 3: TESTS CON NAVEGADOR REAL (OPCIONAL)');
        console.log('-'.repeat(50));
        console.log('⚠️  Esta fase puede tardar 2-3 minutos...');

        const browserInput = process.argv.includes('--skip-browser') ? 'n' : 'y';

        if (browserInput.toLowerCase() === 'y') {
            const testSuite = new TestSuite();
            await testSuite.runAllTests();

            results.browser.passed = testSuite.results.filter(r => r.passed).length;
            results.browser.total = testSuite.results.length;
        } else {
            console.log('🔄 Tests con navegador saltados (usar --browser para incluir)');
            results.browser.passed = 0;
            results.browser.total = 0;
        }

    } catch (error) {
        console.error('❌ Error ejecutando tests:', error);
        process.exit(1);
    }

    // Resumen final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN FINAL DE TESTS');
    console.log('='.repeat(70));

    const totalPassed = results.edge.passed + results.integration.passed + results.browser.passed;
    const totalTests = results.edge.total + results.integration.total + results.browser.total;

    console.log(`🔍 Tests Edge Cases:    ${results.edge.passed}/${results.edge.total} ✅`);
    console.log(`🔄 Tests Integración:   ${results.integration.passed}/${results.integration.total} ✅`);
    console.log(`🌐 Tests Navegador:     ${results.browser.passed}/${results.browser.total} ✅`);
    console.log('-'.repeat(50));
    console.log(`📈 TOTAL:               ${totalPassed}/${totalTests} ✅`);

    const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    console.log(`📊 Tasa de éxito:       ${successRate}%`);

    if (successRate >= 90) {
        console.log('\n🎉 ¡EXCELENTE! El scraper está listo para producción');
        console.log('✅ Puedes proceder a subir a Apify con confianza');
        process.exit(0);
    } else if (successRate >= 75) {
        console.log('\n⚠️  ACEPTABLE, pero revisar tests fallidos antes de producción');
        process.exit(1);
    } else {
        console.log('\n❌ CRÍTICO: Demasiados tests fallaron');
        console.log('🔧 Revisar y corregir problemas antes de continuar');
        process.exit(1);
    }
}

// Mostrar ayuda
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🚀 CARZILLA.DE SCRAPER - SUITE DE TESTS

USO:
    node run_tests.js [opciones]

OPCIONES:
    --skip-browser    Saltar tests con navegador real (más rápido)
    --browser         Incluir tests con navegador (por defecto)
    --help, -h        Mostrar esta ayuda

EJEMPLOS:
    node run_tests.js                    # Todos los tests
    node run_tests.js --skip-browser     # Solo tests rápidos
    node run_tests.js --browser          # Incluir tests con navegador

DESCRIPCIÓN:
    Este script ejecuta una suite completa de tests para verificar
    que el scraper de Carzilla.de funciona correctamente antes de
    subirlo a producción en Apify.

    Los tests incluyen:
    - Verificación de mapeos de marcas y modelos
    - Construcción correcta de URLs
    - Manejo de casos edge
    - Integración con formato UnifiedCar
    - Tests con navegador real (opcional)
`);
    process.exit(0);
}

// Ejecutar tests
runAllTests().catch(error => {
    console.error('💥 Error fatal ejecutando tests:', error);
    process.exit(1);
});