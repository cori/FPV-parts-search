# FPV Deal Hunter - Val.town Edition

A serverless FPV drone parts deal aggregator that scrapes clearance pages from multiple vendors and presents them in a unified dashboard. Now with full catalog search!

## Features

- ✅ **Catalog Search**: Search across all vendor catalogs for specific products
- ✅ **Smart Defaults**: Shows clearance deals by default, search on demand
- ✅ **Parallel Scraping**: Fetches from 7 FPV vendors concurrently
- ✅ **Smart Caching**: 15-minute TTL cache (separate for clearance and searches)
- ✅ **Error Tracking**: Reports failed vendor fetches with direct links
- ✅ **Responsive UI**: Alpine.js + Tailwind CSS dashboard (no React!)
- ✅ **Polite Scraping**: Respectful headers and rate limiting
- ✅ **TDD Development**: Comprehensive test coverage (28 tests)

## Vendors

The following independent FPV vendors are currently supported:

1. **GetFPV** - Clearance + Full catalog search
2. **RaceDayQuads** - Clearance + Full catalog search
3. **Pyrodrone** - Clearance + Full catalog search
4. **NewBeeDrone** - Clearance + Full catalog search
5. **TinyWhoop** - Clearance + Full catalog search
6. **RotorRiot** - Clearance + Full catalog search
7. **Webleedfpv** - Clearance + Full catalog search

## Project Structure

```
val-town/
├── index.js           # HTTP handler (Val.town entry point)
├── fetcher.js         # Parallel vendor fetching logic
├── scraper.js         # HTML parsing and data extraction
├── vendors.js         # Vendor configuration
├── cache.js           # Caching layer
├── *.test.js          # Test files
├── fixtures/          # HTML fixtures for tests
└── package.json       # Dependencies
```

## Local Development

### Prerequisites

- Node.js 18+ (for native test runner)

### Installation

```bash
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

### Test Coverage

- **7 scraper tests**: Price normalization, URL handling, HTML parsing
- **6 fetcher tests**: Parallel fetching, error handling, caching
- **6 handler tests**: HTTP routing, CORS, API responses
- **9 vendor tests**: URL building, search query encoding, vendor configuration

**Total: 28 tests, all passing ✅**

## Deploying to Val.town

### Option 1: Via Web Interface

1. Go to [val.town](https://val.town)
2. Create a new HTTP val
3. Copy the contents of `index.js` into the val
4. Add the following as separate vals in your workspace:
   - `fetcher.js`
   - `scraper.js`
   - `vendors.js`
   - `cache.js`
5. Update imports in `index.js` to reference your vals:
   ```javascript
   import { fetchAllVendors } from "https://esm.town/v/yourname/fetcher";
   ```

### Option 2: Via CLI (Recommended)

```bash
# Install Val.town CLI
npm install -g @valtown/sdk

# Login
valtown login

# Deploy
valtown deploy index.js
```

### Important Notes for Val.town

1. **ESM Imports**: Val.town uses ESM modules with HTTPS imports
2. **No package.json**: Dependencies are imported via CDN (cheerio via esm.sh)
3. **Caching**: Replace in-memory cache with Val.town Blob storage for persistence:
   ```javascript
   import { blob } from "https://esm.town/v/std/blob";
   ```

## API Endpoints

### `GET /`

Returns the dashboard HTML interface with search functionality.

### `GET /api/deals`

Returns JSON with deals - clearance by default, or search results if query provided.

**Query Parameters:**
- `q=search+term` - Search all vendors for specific products (e.g., `?q=battery` or `?q=5+inch+frame`)
- `refresh=true` - Force fresh fetch, bypass cache

**Examples:**
- `/api/deals` - Get all clearance deals
- `/api/deals?q=battery` - Search all vendors for "battery"
- `/api/deals?q=camera&refresh=true` - Fresh search for "camera"

**Response:**
```json
{
  "deals": [
    {
      "vendor": "GetFPV",
      "title": "Product Name",
      "price_str": "$29.99",
      "price_val": 29.99,
      "link": "https://...",
      "image": "https://..."
    }
  ],
  "failed": [
    {
      "vendor": "VendorName",
      "error": "Error message",
      "url": "https://..."
    }
  ],
  "cached": false,
  "timestamp": 1234567890,
  "searchQuery": "battery"
}
```

## Headers

The scraper uses polite headers:

- **User-Agent**: Custom identifier with project URL
- **Accept**: Standard HTML types
- **Cache-Control**: `no-cache` for fresh results
- **Accept-Encoding**: Standard compression

## Caching Strategy

- **TTL**: 15 minutes (900 seconds)
- **Strategy**: Read-through cache with separate keys for clearance and searches
- **Cache Keys**:
  - `"all-deals"` for clearance items
  - `"search-{query}"` for each unique search term
- **Invalidation**: Manual via `?refresh=true` parameter
- **Storage**: In-memory (local) or Val.town Blob (production)

## Adding New Vendors

1. Identify the clearance/sale page URL and search URL pattern
2. Inspect HTML structure to find CSS selectors for:
   - Product card container
   - Title
   - Price
   - Link
   - Image
3. Add to `vendors.js`:

```javascript
{
  name: "VendorName",
  url: "/collections/clearance",
  searchUrl: "/search?q={query}",  // {query} will be replaced with search term
  base_url: "https://vendor.com",
  selectors: {
    card: ".product-card",
    title: ".product-title",
    price: ".price",
    image: "img.product-image",
    link: "a.product-link"
  }
}
```

4. Add test fixtures in `fixtures/vendor-sample.html`
5. Run tests to verify

## Performance

- **Parallel Fetching**: All vendors fetched concurrently
- **Typical Response Time**: 2-5 seconds (uncached)
- **Cached Response**: <100ms
- **Vendors Scanned**: 7 stores
- **Average Clearance Deals**: 50-200 items
- **Search Results**: Varies by query (10-500+ items)

## Architecture Decisions

### Why Alpine.js instead of React?

- Lighter weight (15kb vs 100kb+)
- No build step required
- Perfect for Val.town's serverless environment
- Simpler state management for this use case

### Why In-Memory Cache?

- Fast read/write
- No external dependencies
- Val.town sessions are ephemeral anyway
- Can easily swap to Blob storage for persistence

### Why Cheerio for Parsing?

- Lightweight (vs Playwright/Puppeteer)
- Works in serverless environments
- jQuery-like API (familiar)
- No browser needed for static HTML

## Limitations

- No JavaScript rendering (static HTML only)
- Some vendors may block scraping
- Cache is per-instance (not shared in Val.town)
- No authentication/personalization

## Future Improvements

- [ ] Add more vendors (15+ available)
- [ ] Price history tracking
- [ ] Email alerts for specific products
- [ ] Filter by category/product type
- [ ] Persistent cache with Val.town Blob
- [ ] Rate limiting per vendor
- [ ] Retry logic with exponential backoff

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests first (TDD!)
4. Implement feature
5. Ensure all tests pass
6. Submit PR

## Credits

Built with:
- [Val.town](https://val.town) - Serverless platform
- [Cheerio](https://cheerio.js.org/) - HTML parsing
- [Alpine.js](https://alpinejs.dev/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
