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
        const response = await scraper.scrape(input);

        console.log(`📊 Scraping completed: ${response?.items?.length || 0} cars found`);
        console.log(`⏱️ Execution time: ${response?.execution_time_ms}ms`);
        console.log(`🔗 Search URL: ${response?.search_url}`);

        // Save results to Apify dataset
        if (response?.items && Array.isArray(response.items)) {
            for (const car of response.items) {
                await Actor.pushData(car);
            }
            console.log(`✅ Saved ${response.items.length} cars to dataset`);
        } else {
            console.log('⚠️ No valid cars array returned in response.items');
        }

        console.log('✅ All data saved to dataset');
        console.log('🎉 Scraping completed successfully!');

    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
        throw error;
    }
});