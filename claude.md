# Carzilla.de Apify Scraper - IMPORTOCOCHES.COM Integration

  ## Project Overview
  **Automated scraper** for Carzilla.de car listings to serve as data source for **importocoches.com** Rails application. This scraper will integrate with the existing data source system (Mobile.de API) to have a dual data source (Mobile.de API and APIFY).

  ## Parent Application Context: IMPORTOCOCHES.COM

  ### Business Model
  - **Ruby on Rails** car import business from Germany to Spain
  - **Primary data source**: Mobile.de API (costs per request)
  - **Target market**: Multi-language support (ES, FR, EN, CAT, RU, DE, NL)
  - **Specialty brands**: BMW, Mercedes, Porsche, Audi, VW, Mini, Cupra, Tesla, Lamborghini

  ### Current Data Flow Architecture
  User Search Form → CarSearch Service → Mobile.de API → UnifiedCar Model → Results View
                                    ↓
                       (NEW) Apify Scraper → Carzilla.de → UnifiedCar Model

  ## Data Format Requirements

  ### Input Parameters (from Rails app)
  The scraper must accept these parameters from the parent Rails application (if some parameters are difficult to implement, we can avoid them if needed):

  ```ruby
  # Standard search parameters from importocoches.com
  {
    "make": "BMW",                    # Fixed dropdown selection
    "model": "320",                   # Fixed dropdown selection from JSON
    "model_description": "xDrive",    # FREE TEXT field for variants
    "price_min": "15000",             # Optional minimum price
    "price_max": "50000",             # Maximum price filter
    "mileage_max": "100000",          # Maximum mileage in KM
    "first_registration_date": "2020", # Minimum year (YYYY format)
    "fuel": "Híbrido (gasolina/eléctrico)", # Fuel type
    "potencia": "147",                # Minimum power in kW
    "transmision": "AUTOMATIC_GEAR",  # Transmission type
    "fourwheeldrive": "1"             # 4x4 boolean (0/1)
  }

  Fuel Type Mapping (Spanish to Standard)

  "Gasolina" → "PETROL"
  "Diésel" → "DIESEL"
  "Gas de automoción" → "LPG"
  "Gas natural" → "CNG"
  "Eléctrico" → "ELECTRICITY"
  "Híbrido (gasolina/eléctrico)" → "HYBRID"
  "Hidrógeno" → "HYDROGENIUM"
  "Etanol (FFV,E85, etc.)" → "ETHANOL"
  "Híbrido (diésel/eléctrico)" → "HYBRID_DIESEL"
  "Otro" → "OTHER"

  Transmission Mapping

  "Manual" → "MANUAL_GEAR"
  "Automático" → "SEMIAUTOMATIC_GEAR" or "AUTOMATIC_GEAR"

  Power Conversion (CV to kW)

  "90cv" → "66" kW
  "120cv" → "88" kW
  "150cv" → "110" kW
  "200cv" → "147" kW
  "300cv" → "220" kW
  "400cv" → "294" kW
  "550cv" → "404" kW

  Available Brands and Models

  The scraper should support these exact brand/model combinations:

  {
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
    "Mercedes-Benz": ["A 250", "B 250", "C 300","C 350","C 400", "Citan", "CLA 250","CLA 250 Shooting Brake", "CLE 300", "E 300","E 350", "EQA","EQB","EQC","EQE","EQS","EQT", "EQV", "G 850", "GLA 250", "GLC 350", "GLE 500", "GLS 450", "GLS 500",
   "S 450", "S 560", "Sprinter"],
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
  }

  Output Format Requirements

  UnifiedCar Model Structure

  The scraper must return data in this exact format to integrate with the existing Rails application:

  // Required output format for each car (if some parameters are difficult to implement, we can avoid them if needed)
  {
    "id": "unique_identifier",           // String - unique car ID
    "make": "BMW",                       // String - car brand
    "description": "320 xDrive",         // String - model + description
    "price_bruto": "35000",              // String - price in EUR
    "vat": "19",                         // String - VAT percentage
    "first_registration": "2020-03",     // String - YYYY-MM format
    "mileage": "45000",                  // String - kilometers
    "power": "147",                      // String - power in kW
    "gearbox": "AUTOMATIC_GEAR",         // String - transmission type
    "fuel": "HYBRID",                    // String - fuel type (mapped)
    "color": "Schwarz",                  // String - car color
    "photo_url": "https://...",          // String - main image URL
    "detail_url": "https://wa.me/34621339515?text=Info%20BMW%20320", // WhatsApp link
    "source": "apify"                    // String - always "apify"
  }

  Integration Points

  Rails Application Integration

  The scraper will be called from the existing ApifyScraperAdapter in the Rails app:

  # In importocoches.com/app/services/data_sources/apify_scraper_adapter.rb
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


  Target Website: Carzilla.de

  Primary Objectives

  1. Scrape car listings from Carzilla.de search results
  2. Apply filters equivalent to Mobile.de API parameters
  3. Extract car details ( price, mileage, year, power, fuel, transmission, images) from each ad on the listing on carzilla index page (just the 1st page of the result).
  4. Return standardized data in UnifiedCar format

  Scraping Requirements

  - Maximum execution time: 20 seconds per search
  - Error handling: Graceful failures with partial results
  - Rate limiting: Respect website's robots.txt and avoid blocking
  - Data quality: Validate and clean extracted data

  Fallback Strategy

  When specific filters aren't available on Carzilla.de:
  - Use broad search parameters (brand + model only)
  - Apply client-side filtering on results

  Development Approach

  Phase 1: Research & Planning

  - Analyze Carzilla.de website structure
  - Map available filters to Mobile.de equivalents
  - Identify car listing page format
  - Test search functionality manually

  Phase 2: Core Scraper Development

  - Set up Apify Actor project structure
  - Implement input parameter handling
  - Create web scraping logic for search results
  - Extract individual car data points
  - Implement data transformation to UnifiedCar format

  Phase 3: Integration & Testing

  - Test with various search parameters
  - Validate output format compatibility
  - Implement error handling and timeouts
  - Deploy to Apify platform

  Phase 4: Rails Integration (not on the scope of the app in this directory, here we will only do the scrapper code)

  - Update Rails app with Apify credentials
  - Test admin toggle functionality
  - Monitor performance and reliability


  IMPORTANT: This scraper serves as a backup data source when Mobile.de API is unavailable or rate-limited. Focus on reliability and data consistency over advanced filtering capabilities.
  ```
