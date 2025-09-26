# Carzilla.de Car Scraper

Apify scraper for Carzilla.de car listings, designed for integration with importocoches.com Rails application.

## Features

- Scrapes car listings from Carzilla.de
- Supports 43/48 car brands (90% coverage)
- Returns data in UnifiedCar format
- Comprehensive filtering: price, mileage, year, fuel, transmission, 4x4
- Performance: 4-6 seconds per search
- Graceful handling of unsupported brands

## Usage

```json
{
  "make": "BMW",
  "model": "530",
  "price_max": "50000",
  "mileage_max": "100000",
  "maxPages": 1,
  "headless": true
}
```

## Output Format

Returns cars in UnifiedCar format compatible with importocoches.com Rails application.

For detailed documentation, see DEPLOYMENT_GUIDE.md