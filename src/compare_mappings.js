const fs = require('fs');

// Expected brands and models from importocoches.com Rails app (from CLAUDE.md)
const RAILS_APP_BRANDS_MODELS = {
    "Abarth": ["500", "500C", "600e"],
    "Alfa Romeo": ["Junior"],
    "Audi": ["A3", "A4", "A5", "A6", "A6 e-tron", "A7", "A8", "e-tron", "e-tron GT", "Q3", "Q4", "Q5", "Q6 e-tron", "Q7", "Q8", "Q8 e-tron", "RS e-tron GT"],
    "BMW": ["225 Active Tourer", "230", "320", "330", "530", "550", "750", "760", "XM", "X1", "X3", "X5", "X6", "i3", "i4", "i5", "i7", "i8", "iX", "iX1", "iX2", "iX3"],
    "Bentley": ["Bentayga", "Continental GT", "Continental GTC", "Flying Spur"],
    "BYD": ["ATTO 2", "ATTO 3", "DOLPHIN", "ETP 3", "HAN", "SEAL", "SEALION 7", "Seal U", "TANG"],
    "Citroen": ["AMI","Berlingo", "C3", "C3 Aircross", "C4", "C4 X", "C5 X", "E-Mehari", "Jumpy", "SpaceTourer"],
    "Cupra": ["Born", "Formentor", "Leon", "Tavascan", "Terramar"],
    "Dacia": ["Bigster", "Duster", "Jogger", "Spring"],
    "DS": ["DS3", "DS3 Crossback", "DS4", "DS5", "DS9"],
    "Fiat": ["500e", "600e", "Doblo", "Ducato", "Scudo", "Topolino", "Ulysse"],
    "Ford": ["Capri", "Explorer", "Kuga", "Mustang Mach-E", "Puma Gen-E", "Tourneo", "Tourneo Connect", "Tourneo Courier", "Tourneo Custom", "Transit", "Transit Connect", "Transit Courier", "Transit Custom"],
    "Genesis": ["G80", "GV60", "GV70", "GV80"],
    "Hyundai": ["INSTER", "IONIQ", "IONIQ 5","IONIQ 6", "IONIQ 9", "Kona", "Santa Fe", "Tucson"],
    "Jaguar": ["E-Pace", "F-Pace", "I-Pace"],
    "Jeep": ["Avenger", "Compass", "Grand Cherokee", "Renegade", "Wrangler"],
    "Kia": ["cee'd", "EV3", "EV6", "EV9", "Niro", "Niro EV", "Optima", "Sorento", "Soul", "Sportage", "Xceed"],
    "Lamborghini": ["Urus"],
    "Land Rover": ["Defender", "Discovery Sport", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
    "Lexus": ["NX 200", "NX 300", "RX 200", "RX 300", "RX 330", "RX 350", "RX 400", "RX 450", "UX", "RZ"],
    "Lotus": ["Eletre", "Emeya"],
    "Lucid": ["Air"],
    "Maserati": ["GranTurismo", "Grecale"],
    "Maxus": ["Deliver 9", "eDeliver 3", "eDeliver 9", "Euniq 5", "Euniq 6", "Mifa 9", "T90"],
    "Mazda": ["6", "CX-30", "CX-5", "CX-60", "CX-80", "MX-30"],
    "Mercedes-Benz": ["A 250", "B 250", "C 300","C 350","C 400", "Citan", "CLA 250","CLA 250 Shooting Brake", "CLE 300", "E 300","E 350", "EQA","EQB","EQC","EQE","EQS","EQT", "EQV", "G 850", "GLA 250", "GLC 350", "GLE 500", "GLS 450", "GLS 500", "S 450", "S 560", "Sprinter"],
    "MG": ["EHS","HS","Marvel R", "MG3", "MG4","MG5","ZS", "S5"],
    "Mini": ["Cooper SE", "Aceman", "Cooper SE Countryman"],
    "Mitsubishi": ["ASX", "Eclipse Cross", "Outlader"],
    "Nio": ["EL6", "EL7", "EL8", "ET5", "ET7"],
    "Nissan": ["Ariya", "Interstar", "Leaf", "Micra", "Navara", "NV200", "Qashqai", "Townstar", "e-NV200"],
    "Opel": ["Ampera-e","Astra","Astra Electric","Combo","Combo Life","Corsa","Grandland X","Insignia","Insignia CT","Karl","Meriva","Mokka-e","Rocks-e","Vivaro","Zafira","Zafira Life"],
    "Peugeot": ["2008", "208", "3008", "308", "408", "5008", "508", "Boxer", "Expert", "iOn", "Partner", "Rifter", "Traveller"],
    "Polestar": ["1","2", "3", "4"],
    "Porsche": ["Cayenne", "Macan", "Panamera", "Taycan"],
    "Renault": ["Arkana", "Austral", "Clio", "Kangoo", "Megane", "Master", "Rafale", "Scenic", "Twingo", "Twizy"],
    "Rolls Royce": ["Spectre"],
    "Seat": ["Leon", "Mii", "Tarraco"],
    "Skoda": ["Citigo", "Elroq", "Enyaq", "Fabia", "Kamiq", "Karoq", "Kodiaq", "Octavia", "Superb"],
    "Smart": ["ONE", "THREE", "FIVE", "ForFour", "ForTwo"],
    "Ssangyong": ["Korando", "Torres", "Rexton", "Tivoli"],
    "Subaru": ["Solterra"],
    "Suzuki": ["Across", "Ignis", "Jimny", "Swace", "Swift", "Vitara"],
    "Tesla": ["Model 3", "Model S", "Model X", "Model Y"],
    "Toyota": ["Auris", "Aygo", "bZ4X", "C-HR", "Corolla", "Corolla Cross", "Prius", "RAV 4", "Yaris"],
    "VW": ["Arteon", "Caddy", "Crafter", "Golf", "ID.3", "ID.4", "ID.5", "ID.7", "Passat", "Polo", "T6", "T6 Caravelle", "T6 Transporter", "T7 Multivan", "T7 California", "T7 Caravelle", "T7 Transporter", "Tiguan", "Touareg", "up!"],
    "Volvo": ["EX30", "EX40", "EX90", "S60", "S90", "V60", "V90", "XC 40", "XC 60", "XC 90"],
    "XPENG": []
};

function compareMappings() {
    console.log('Comparing Rails app brand/model names with Carzilla.de mappings...\n');

    // Load the Carzilla mappings
    let carzillaData;
    try {
        const rawData = fs.readFileSync('all_brands_data.json', 'utf8');
        carzillaData = JSON.parse(rawData);
    } catch (error) {
        console.error('Could not load Carzilla mappings. Make sure all_brands_data.json exists.');
        return;
    }

    const carzillaBrands = carzillaData.foundBrands.map(b => b.name);
    const carzillaMappings = carzillaData.brandModelMappings;

    const brandMismatches = [];
    const modelMismatches = [];
    const brandMatches = [];

    // Compare brands
    console.log('=== BRAND COMPARISON ===');
    Object.keys(RAILS_APP_BRANDS_MODELS).forEach(railsBrand => {
        // Check for exact match
        let carzillaBrand = carzillaBrands.find(cb => cb === railsBrand);

        // Check for close matches
        if (!carzillaBrand) {
            if (railsBrand === 'Mini' && carzillaBrands.includes('MINI')) {
                carzillaBrand = 'MINI';
            } else if (railsBrand === 'VW' && carzillaBrands.includes('Volkswagen')) {
                carzillaBrand = 'Volkswagen';
            } else if (railsBrand === 'Ssangyong' && carzillaBrands.includes('SSangYong')) {
                carzillaBrand = 'SSangYong';
            }
        }

        if (carzillaBrand) {
            brandMatches.push({ rails: railsBrand, carzilla: carzillaBrand });
            console.log(`✓ ${railsBrand} → ${carzillaBrand}`);
        } else {
            brandMismatches.push(railsBrand);
            console.log(`✗ ${railsBrand} (not found on Carzilla)`);
        }
    });

    console.log(`\nBrand summary: ${brandMatches.length} matches, ${brandMismatches.length} mismatches`);

    // Compare models for matched brands
    console.log('\n=== MODEL COMPARISON ===');
    brandMatches.forEach(({ rails: railsBrand, carzilla: carzillaBrand }) => {
        const railsModels = RAILS_APP_BRANDS_MODELS[railsBrand];
        const carzillaModels = carzillaMappings[carzillaBrand]?.models || [];
        const carzillaModelNames = carzillaModels.map(m => m.name);

        console.log(`\n${railsBrand} (${railsModels.length} expected models):`);

        const matchedModels = [];
        const missedModels = [];

        railsModels.forEach(railsModel => {
            // Try exact match first
            let match = carzillaModelNames.find(cm => cm === railsModel);

            // Try common variations
            if (!match) {
                // Remove spaces and compare
                const railsClean = railsModel.replace(/\s+/g, '');
                match = carzillaModelNames.find(cm => cm.replace(/\s+/g, '') === railsClean);
            }

            // Try partial matches
            if (!match) {
                match = carzillaModelNames.find(cm =>
                    cm.toLowerCase().includes(railsModel.toLowerCase()) ||
                    railsModel.toLowerCase().includes(cm.toLowerCase())
                );
            }

            if (match) {
                matchedModels.push({ rails: railsModel, carzilla: match });
                console.log(`  ✓ ${railsModel} → ${match}`);
            } else {
                missedModels.push(railsModel);
                console.log(`  ✗ ${railsModel} (not found)`);
            }
        });

        if (missedModels.length > 0) {
            modelMismatches.push({
                brand: railsBrand,
                missedModels: missedModels,
                availableModels: carzillaModelNames.slice(0, 10) // Show first 10 available models
            });
        }

        console.log(`  ${matchedModels.length}/${railsModels.length} models matched`);
    });

    // Generate mapping layer
    console.log('\n=== GENERATING MAPPING LAYER ===');
    generateMappingLayer(brandMatches, modelMismatches);

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Brands: ${brandMatches.length}/${Object.keys(RAILS_APP_BRANDS_MODELS).length} matched`);
    console.log(`Mismatched brands: ${brandMismatches.join(', ')}`);
    console.log(`Brands with model mismatches: ${modelMismatches.length}`);

    if (modelMismatches.length > 0) {
        console.log('\nBrands needing model mapping attention:');
        modelMismatches.forEach(({ brand, missedModels }) => {
            console.log(`  ${brand}: ${missedModels.length} models need mapping`);
        });
    }
}

function generateMappingLayer(brandMatches, modelMismatches) {
    const brandMapping = {};
    const modelMapping = {};

    // Create brand name mapping
    brandMatches.forEach(({ rails, carzilla }) => {
        if (rails !== carzilla) {
            brandMapping[rails] = carzilla;
        }
    });

    // TODO: Model mapping would need manual work for mismatches

    const mappingLayer = `// Brand and Model Name Mapping Layer
// Maps Rails app names to Carzilla.de names
// Generated on: ${new Date().toISOString()}

const BRAND_NAME_MAPPING = ${JSON.stringify(brandMapping, null, 4)};

// Function to convert Rails app brand name to Carzilla brand name
function mapBrandName(railsBrandName) {
    return BRAND_NAME_MAPPING[railsBrandName] || railsBrandName;
}

// Function to convert Rails app model name to Carzilla model name
function mapModelName(railsBrandName, railsModelName) {
    // For now, return as-is. Manual mapping may be needed for specific cases.
    // Based on analysis, most models match or are close enough for fuzzy matching.
    return railsModelName;
}

module.exports = {
    BRAND_NAME_MAPPING,
    mapBrandName,
    mapModelName
};
`;

    fs.writeFileSync('mapping_layer.js', mappingLayer);
    console.log('✓ Mapping layer saved to mapping_layer.js');
}

// Run the comparison
compareMappings();