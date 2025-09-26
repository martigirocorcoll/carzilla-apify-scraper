// Complete parameter mapping from importocoches.com to Carzilla.de
// Based on analysis of Carzilla.de search form elements

const { BRAND_MAP, MODEL_MAP } = require('../final_complete_mappings.js');

const FUEL_TYPE_MAPPING = {
    'Gasolina': 'mt-1',              // Benzin checkbox
    'Diésel': 'mt-2',                // Diesel checkbox
    'Gas de automoción': 'mt-3',     // Gas checkbox
    'Gas natural': 'mt-8',           // Erdgas checkbox
    'Eléctrico': 'mt-4',             // Elektro checkbox
    'Híbrido (gasolina/eléctrico)': 'mt-5',   // Hybrid checkbox
    'Hidrógeno': 'mt-12',            // Wasserstoff checkbox
    'Etanol (FFV,E85, etc.)': null,  // Not available on Carzilla
    'Híbrido (diésel/eléctrico)': 'mt-9',     // Hybrid-Diesel checkbox
    'Otro': null                     // Not available on Carzilla
};

const TRANSMISSION_MAPPING = {
    'Manual': 'tm-1',                // Schaltgetriebe checkbox
    'Automático': 'tm-2'             // Automatik checkbox
    // Note: Carzilla also has 'tm-3' for Tiptronic
};

// Vehicle condition mapping (Estado in Spanish)
const VEHICLE_CONDITION_MAPPING = {
    'new': 'st-1',                   // Neufahrzeug
    'used': 'st-2',                  // Gebrauchtfahrzeug
    'demo': 'st-4',                  // Vorführfahrzeug
    'daily_registration': 'st-6',    // Tageszulassung
    'annual': 'st-3',                // Jahresfahrzeug
    'company': 'st-5',               // Dienstfahrzeug
    'classic': 'st-10',              // Oldtimer
    'youngtimer': 'st-9'             // Youngtimer
};

// Body type mapping (Carrocería)
const BODY_TYPE_MAPPING = {
    'SUV': 'bt-17',                  // SUV/Gelaendew./Pickup
    'Sedan': 'bt-1',                 // Limousine
    'Station Wagon': 'bt-4',         // Kombi
    'Hatchback': 'bt-6',             // Kleinwagen
    'Van': 'bt-16',                  // Van/Kleinbus
    'Convertible': 'bt-5',           // Cabrio/Roadster
    'Coupe': 'bt-3',                 // Sportwagen/Coupe
    'Pickup': 'bt-92',               // Lieferwagen
    'Compact': 'bt-2'                // Kompakt
};

// Build URL for Carzilla.de search
function buildCarzillaURL(params) {
    const {
        make,
        model,
        model_description,
        price_min,
        price_max,
        mileage_max,
        first_registration_date,
        fuel,
        potencia, // Power in kW
        transmision,
        fourwheeldrive
    } = params;

    // Handle missing brands gracefully
    if (!BRAND_MAP[make]) {
        console.log(`Brand ${make} not supported on Carzilla.de`);
        return null; // This will result in 0 results
    }

    const brandId = BRAND_MAP[make];
    let url = `https://carzilla.de/Fahrzeuge/Fahrzeugliste?m=${brandId}`;

    // Add model if available and supported
    if (model && MODEL_MAP[make] && MODEL_MAP[make][model]) {
        const modelId = MODEL_MAP[make][model];
        url += `&mo=${modelId}`;
    } else if (model) {
        console.log(`Model ${model} for ${make} not found on Carzilla.de`);
        // Continue anyway - search without model filter
    }

    // Price range (convert to Carzilla format)
    if (price_min) {
        // Carzilla uses dropdown values, find closest match
        const priceOptions = [1000, 5000, 10000, 15000, 20000, 30000, 45000, 60000, 75000, 100000, 150000];
        const closestMin = priceOptions.find(p => p >= parseInt(price_min)) || priceOptions[0];
        url += `&price_from=${closestMin}`;
    }

    if (price_max) {
        const priceOptions = [1000, 5000, 10000, 15000, 20000, 30000, 45000, 60000, 75000, 100000, 150000];
        const closestMax = priceOptions.reverse().find(p => p <= parseInt(price_max)) || priceOptions[priceOptions.length - 1];
        url += `&price_to=${closestMax}`;
    }

    // Mileage (convert to kilometers if needed)
    if (mileage_max) {
        const mileageOptions = [0, 1000, 2000, 3000, 4000, 5000, 10000, 20000, 30000, 50000, 75000, 100000, 125000, 150000, 200000];
        const closestMileage = mileageOptions.reverse().find(m => m <= parseInt(mileage_max)) || mileageOptions[mileageOptions.length - 1];
        url += `&mileage_to=${closestMileage}`;
    }

    // Registration year
    if (first_registration_date) {
        const year = parseInt(first_registration_date);
        if (year >= 1980 && year <= 2025) {
            url += `&year_from=${year}`;
        }
    }

    // Power (convert CV to kW if needed)
    if (potencia) {
        let powerKW = parseInt(potencia);
        // If potencia looks like CV (> 200), convert to kW
        if (powerKW > 200) {
            powerKW = Math.round(powerKW * 0.735); // CV to kW conversion
        }

        const powerOptions = [40, 60, 80, 100, 150, 200, 300, 400, 500];
        const closestPower = powerOptions.find(p => p >= powerKW) || powerOptions[0];
        url += `&power_from=${closestPower}`;
    }

    // Fuel type (will be handled via checkboxes in the scraper)
    if (fuel && FUEL_TYPE_MAPPING[fuel]) {
        url += `&fuel=${FUEL_TYPE_MAPPING[fuel]}`;
    }

    // Transmission (will be handled via checkboxes in the scraper)
    if (transmision && TRANSMISSION_MAPPING[transmision]) {
        url += `&transmission=${TRANSMISSION_MAPPING[transmision]}`;
    }

    // 4x4 / All-wheel drive
    if (fourwheeldrive === "1") {
        url += `&allrad=14`; // Allrad checkbox ID
    }

    // Always add: 20 results per page, sorted by price ascending
    url += '&rp=20&sf=prices.SalePrice.value';

    return url;
}

// Helper function to apply checkbox filters during scraping
function getCheckboxFilters(params) {
    const filters = [];

    // Fuel type filters
    if (params.fuel && FUEL_TYPE_MAPPING[params.fuel]) {
        filters.push({
            type: 'checkbox',
            id: FUEL_TYPE_MAPPING[params.fuel],
            name: 'fuel_type'
        });
    }

    // Transmission filters
    if (params.transmision && TRANSMISSION_MAPPING[params.transmision]) {
        filters.push({
            type: 'checkbox',
            id: TRANSMISSION_MAPPING[params.transmision],
            name: 'transmission'
        });
    }

    // 4x4 filter
    if (params.fourwheeldrive === "1") {
        filters.push({
            type: 'checkbox',
            id: '14', // Allrad checkbox
            name: 'allrad'
        });
    }

    return filters;
}

// Graceful handling for unsupported brands/models
function isSearchSupported(params) {
    const { make, model } = params;
    const { mapBrandName } = require('../mapping_layer.js');

    // Map the brand name first
    const mappedMake = mapBrandName(make);

    // Check if mapped brand is supported
    if (!mappedMake || !BRAND_MAP[mappedMake]) {
        return {
            supported: false,
            reason: `Brand "${make}" not available on Carzilla.de`,
            alternativeBrands: Object.keys(BRAND_MAP).filter(b =>
                b.toLowerCase().includes((make || '').toLowerCase())
            ).slice(0, 3)
        };
    }

    // Brand is supported, check model if provided
    if (model) {
        const brandModels = MODEL_MAP[mappedMake];
        if (!brandModels || !brandModels[model]) {
            return {
                supported: true, // Can search without model filter
                warning: `Model "${model}" not found for ${mappedMake}, searching all ${mappedMake} models`,
                availableModels: brandModels ? Object.keys(brandModels).slice(0, 5) : []
            };
        }
    }

    return {
        supported: true,
        reason: 'Full search parameters supported'
    };
}

module.exports = {
    buildCarzillaURL,
    getCheckboxFilters,
    isSearchSupported,
    FUEL_TYPE_MAPPING,
    TRANSMISSION_MAPPING,
    VEHICLE_CONDITION_MAPPING,
    BODY_TYPE_MAPPING
};