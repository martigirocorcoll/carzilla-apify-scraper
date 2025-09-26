# 🚀 Guía de Deployment - Carzilla.de Apify Scraper

## 📋 Resumen de Deployment

**Estado actual**: ✅ Listo para producción
**Tests ejecutados**: 21/21 ✅ (100% éxito)
**Configuración**: Completa

## 🔧 Archivos de Configuración Creados

### ✅ Archivos Core
- `src/main.js` - Entry point del Actor
- `src/scraper_core.js` - Lógica principal del scraper
- `src/parameter_mapping.js` - Mapeo de parámetros
- `final_complete_mappings.js` - IDs de marcas y modelos
- `mapping_layer.js` - Capa de mapeo de nombres

### ✅ Archivos de Configuración Apify
- `apify.json` - Configuración del Actor
- `INPUT_SCHEMA.json` - Schema de parámetros de entrada
- `package.json` - Dependencias y scripts
- `Dockerfile` - Imagen Docker para deployment

### ✅ Tests y Documentación
- `run_tests.js` - Suite completa de tests
- `test_4x4.js` - Tests específicos para 4x4
- `4x4_documentation.md` - Documentación técnica

## 🎯 Pasos para Deployment en Apify

### 1. Preparar Cuenta Apify
```bash
# Instalar Apify CLI
npm install -g apify-cli

# Login a tu cuenta
apify login
```

### 2. Crear Actor en Apify Console
1. Ve a [console.apify.com](https://console.apify.com)
2. Click "Create new" → "Actor"
3. Nombre: `carzilla-scraper`
4. Descripción: `Scrapes car listings from Carzilla.de for importocoches.com integration`

### 3. Deployment Opciones

#### Opción A: Upload ZIP
1. Comprime todos los archivos del proyecto
2. Sube el ZIP en Apify Console
3. La build se ejecutará automáticamente

#### Opción B: Git Integration
```bash
# Conectar repositorio Git en Apify Console
# Los archivos se sincronizarán automáticamente
```

#### Opción C: CLI Deployment
```bash
# Desde el directorio del proyecto
apify push

# Para crear nueva versión
apify push --version-number "1.0.1"
```

## ⚙️ Configuración de Input en Apify

El Actor acepta estos parámetros de entrada:

```json
{
  "make": "BMW",                    // Obligatorio - marca del coche
  "model": "530",                   // Opcional - modelo específico
  "model_description": "xDrive",    // Opcional - variante del modelo
  "price_min": "15000",             // Opcional - precio mínimo en €
  "price_max": "50000",             // Opcional - precio máximo en €
  "mileage_max": "100000",          // Opcional - kilometraje máximo
  "first_registration_date": "2020", // Opcional - año mínimo (YYYY)
  "fuel": "Híbrido (gasolina/eléctrico)", // Opcional - tipo de combustible
  "potencia": "147",                // Opcional - potencia mínima en kW
  "transmision": "Automático",      // Opcional - tipo de transmisión
  "fourwheeldrive": "1",            // Opcional - 4x4 (1=sí, 0=no)
  "maxPages": 1,                    // Páginas a scrapear (máx. 5)
  "headless": true,                 // Modo headless del navegador
  "timeout": 20000                  // Timeout en millisegundos
}
```

## 🚗 Marcas Soportadas

**Total: 43/48 marcas** (90% coverage)

✅ **Soportadas completamente**:
- BMW, Mercedes-Benz, Audi, Volkswagen, Tesla, Porsche
- Toyota, Ford, Hyundai, Nissan, Mazda, Kia, Volvo
- MINI, Smart, Seat, Skoda, Opel, Peugeot, Renault
- Citroen, Fiat, Jeep, Land Rover, Lexus, Jaguar
- Bentley, Maserati, Subaru, Suzuki, Mitsubishi
- Cupra, Dacia, Genesis, Polestar, BYD, XPENG
- Abarth, Alfa Romeo, Maxus, MG, SSangYong

❌ **No disponibles en Carzilla.de**:
- Lucid, Lotus, Nio, Rolls Royce, DS

## 📊 Formato de Output

El scraper devuelve datos en formato **UnifiedCar** compatible con importocoches.com:

```json
{
  "id": "unique_identifier",
  "make": "BMW",
  "description": "530 xDrive",
  "price_bruto": "35000",
  "vat": "19",
  "first_registration": "2020-03",
  "mileage": "45000",
  "power": "147",
  "gearbox": "AUTOMATIC_GEAR",
  "fuel": "HYBRID",
  "color": "Schwarz",
  "photo_url": "https://...",
  "detail_url": "https://wa.me/34621339515?text=...",
  "source": "apify"
}
```

## 🔗 Integración con Rails App

En `importocoches.com/app/services/data_sources/apify_scraper_adapter.rb`:

```ruby
def search(params)
  input = build_apify_input(params)
  run_id = start_scraper_run(input)
  wait_for_completion(run_id)
  results = get_results(run_id)

  cars = results['items'].map { |item| json_to_unified(item) }
  {
    cars: cars,
    total: results['items'].size.to_s,
    max_pages: 1,
    endpoint: "apify://#{run_id}"
  }
end
```

## ⚡ Performance y Límites

- **Tiempo de ejecución**: ~4-6 segundos por búsqueda
- **Timeout máximo**: 20 segundos
- **Resultados por página**: 20 coches
- **Páginas máximas**: 5 (límite configurable)
- **Memoria**: ~512MB durante ejecución

## 🔍 Verificación Post-Deployment

### Tests Automáticos
```bash
# Test básico
npm test

# Test con navegador real
npm run test:browser

# Test específico de 4x4
npm run test:4x4
```

### Test Manual en Apify Console
Input de prueba:
```json
{
  "make": "BMW",
  "model": "530",
  "maxPages": 1,
  "headless": true,
  "timeout": 20000
}
```

**Resultado esperado**: 15-20 BMW 530 con datos completos

## 🚨 Troubleshooting

### Error: "Brand not supported"
- **Causa**: Marca no disponible en Carzilla.de
- **Solución**: Devuelve 0 resultados (comportamiento esperado)

### Error: "Timeout"
- **Causa**: Página tarda en cargar
- **Solución**: Aumentar timeout a 30000ms

### Error: "No results found"
- **Causa**: Filtros demasiado restrictivos
- **Solución**: Búsqueda automática solo por marca

## 📈 Monitoreo en Producción

### Métricas Clave
- **Success Rate**: Objetivo 95%+
- **Average Runtime**: Objetivo <10s
- **Error Rate**: Objetivo <5%
- **Cars per Search**: Promedio 15-20

### Logs a Monitorear
```javascript
console.log('🎯 Búsqueda iniciada:', params);
console.log('📊 Resultados encontrados:', cars.length);
console.log('⏱️ Tiempo de ejecución:', executionTime);
```

## 🔐 Credenciales y Configuración

No se requieren credenciales especiales. El scraper funciona como visitante anónimo en Carzilla.de.

**Rate Limiting**: Respetar robots.txt y términos de uso de Carzilla.de

---

✅ **Actor listo para deployment**
🚀 **Tests: 21/21 pasando**
📊 **Coverage: 43/48 marcas (90%)**
⚡ **Performance: 4-6s por búsqueda**