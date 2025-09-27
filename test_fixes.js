const CarzillaScraper = require('./src/scraper_core.js');

async function testFixes() {
    console.log('🧪 Testing Carzilla scraper fixes...');

    const scraper = new CarzillaScraper({
        headless: false,
        timeout: 30000
    });

    const testInput = {
        make: 'Audi',
        model: 'Q3',
        price_max: '50000',
        first_registration_date: '2023'
    };

    try {
        console.log('📊 Running test with input:', JSON.stringify(testInput, null, 2));

        const results = await scraper.scrape(testInput);

        console.log('\n📋 RESULTS:');
        console.log(`Total cars found: ${results.items.length}`);
        console.log(`Search URL: ${results.search_url}`);

        if (results.items.length > 0) {
            console.log('\n🚗 First car details:');
            const firstCar = results.items[0];
            console.log(`- ID: ${firstCar.id}`);
            console.log(`- Make: ${firstCar.make}`);
            console.log(`- Description: ${firstCar.description}`);
            console.log(`- Price: ${firstCar.price_bruto} €`);
            console.log(`- VAT: ${firstCar.vat}%`);
            console.log(`- Mileage: ${firstCar.mileage} km`);
            console.log(`- Registration: ${firstCar.first_registration}`);
            console.log(`- Power: ${firstCar.power} kW`);
            console.log(`- Fuel: ${firstCar.fuel}`);
            console.log(`- Gearbox: ${firstCar.gearbox}`);
            console.log(`- Color: ${firstCar.color}`);
            console.log(`- Photo URL: ${firstCar.photo_url}`);
            console.log(`- Detail URL: ${firstCar.detail_url}`);

            console.log('\n📊 All cars summary:');
            results.items.forEach((car, index) => {
                console.log(`${index + 1}. ${car.make} ${car.description} - ${car.price_bruto}€ - ${car.mileage}km`);
            });
        } else {
            console.log('❌ No cars found!');
            if (results.error) {
                console.log(`Error: ${results.error}`);
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

testFixes().catch(console.error);