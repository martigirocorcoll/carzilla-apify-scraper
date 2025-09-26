const { Actor } = require('apify');
const CarzillaScraper = require('./scraper_core.js');

Actor.main(async () => {
    console.log('🚀 Starting Carzilla.de Apify Actor...');

    const input = await Actor.getInput();
    console.log('📥 Input parameters:', JSON.stringify(input, null, 2));

    // Create scraper instance
    const scraper = new CarzillaScraper({
        headless: input.headless !== false,
        timeout: input.timeout || 20000
    });

    try {
        // Run the scraper
        const results = await scraper.scrape(input);

        console.log(`📊 Scraping completed: ${results?.length || 0} cars found`);

        // Save results to Apify dataset
        if (results && Array.isArray(results)) {
            for (const car of results) {
                await Actor.pushData(car);
            }
        } else {
            console.log('⚠️ No valid results array returned');
        }

        console.log('✅ All data saved to dataset');
        console.log('🎉 Scraping completed successfully!');

    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
        throw error;
    }
});