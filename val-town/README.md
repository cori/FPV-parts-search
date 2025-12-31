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
- **Optional**: Val.town CLI for easy deployment

### Quick Start with Devcontainer

This repository includes a devcontainer configuration that supports both the Fastly and Val.town implementations:

1. **Open the repository in VS Code**:
   ```bash
   code /path/to/FPV-parts-search
   ```

2. **Reopen in Container**:
   - Press `F1` → "Dev Containers: Reopen in Container"
   - Or click the notification to reopen in container

3. **Container includes**:
   - Node.js 22 (for Val.town)
   - Rust (for Fastly Compute@Edge)
   - Val.town CLI pre-installed
   - All npm dependencies auto-installed
   - Proper VS Code extensions for both platforms

4. **Start developing the Val.town version**:
   ```bash
   cd val-town
   npm test        # Run tests
   valtown --help  # Val.town CLI ready to use
   ```

### Manual Setup

If not using devcontainer:

**1. Install dependencies:**
```bash
npm install
```

**2. Install Val.town CLI (optional for deployment):**
```bash
npm install -g @valtown/sdk
```

**3. Run tests:**

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

### Prerequisites

Install the Val.town CLI (already included in devcontainer):

```bash
npm install -g @valtown/sdk
```

### Quick Deploy via CLI

**Option 1: Using Val.town CLI (Recommended)**

1. **Login to Val.town**:
   ```bash
   valtown login
   ```

2. **Deploy the val**:
   ```bash
   valtown deploy index.js --name fpv-deal-hunter
   ```

3. **Deploy supporting modules**:
   ```bash
   valtown deploy fetcher.js --name fpv-deal-hunter-fetcher
   valtown deploy scraper.js --name fpv-deal-hunter-scraper
   valtown deploy vendors.js --name fpv-deal-hunter-vendors
   valtown deploy cache.js --name fpv-deal-hunter-cache
   ```

4. **Update imports in index.js** to reference your deployed vals:
   ```javascript
   import { fetchAllVendors } from "https://esm.town/v/yourname/fpv-deal-hunter-fetcher";
   ```

5. **Your val is live!**
   - Access at: `https://yourname-fpv-deal-hunter.val.run`

### Manual Deployment via Web Interface

**Option 2: Via Web Interface**

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

### Development Workflow

**Local Development:**
```bash
# Make changes to code
npm test                    # Run tests
npm run test:watch         # Watch mode for TDD

# When ready to deploy
valtown login              # First time only
valtown deploy index.js    # Deploy main handler
```

**Environment Variables:**
If you need to configure settings, use Val.town's environment variables:
```bash
valtown env set CACHE_TTL=900
valtown env set USER_AGENT="YourCustomAgent"
```

### Updating an Existing Val

```bash
# Edit your code locally
npm test  # Ensure tests pass

# Redeploy
valtown deploy index.js --update
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

- [ ] Add more vendors (9+ available from original implementation)
- [ ] Price history tracking
- [ ] Email alerts for specific products
- [ ] Filter by category/product type
- [ ] Persistent cache with Val.town Blob
- [ ] Rate limiting per vendor
- [ ] Retry logic with exponential backoff
- [ ] Advanced search filters (price range, brand, etc.)
- [ ] Recently searched terms history

## Usage Examples

### Via Dashboard

1. **Browse Clearance Deals** (default behavior):
   - Open the dashboard
   - Automatically shows all clearance items from 7 vendors
   - Use filters to refine: vendor dropdown, sort options, client-side text filter

2. **Search for Specific Products**:
   - Type "battery" in the search box → Click "Search"
   - System fetches all battery-related products from all 7 vendors
   - Results show products from regular inventory, not just clearance

3. **Example Searches**:
   - `battery` - Find all batteries
   - `5 inch frame` - Find 5" racing frames
   - `camera` - Find FPV cameras
   - `vtx` - Find video transmitters
   - `motor 2207` - Find specific motor size

4. **Return to Clearance**:
   - Click the "X" button next to search
   - Or submit empty search

### Via API

```bash
# Get all clearance deals
curl https://your-val.val.town/api/deals

# Search for batteries
curl https://your-val.val.town/api/deals?q=battery

# Search for cameras, force fresh fetch
curl https://your-val.val.town/api/deals?q=camera&refresh=true

# Complex search
curl https://your-val.val.town/api/deals?q=5+inch+frame
```

## How It Works

### Default Mode (Clearance)
1. User loads page or calls `/api/deals`
2. System checks cache for `"all-deals"` key
3. If cached (< 15 min), returns cached data
4. Otherwise, fetches clearance pages from all 7 vendors in parallel
5. Parses HTML, normalizes data, sorts by price
6. Caches result and returns

### Search Mode
1. User searches for "battery" or calls `/api/deals?q=battery`
2. System checks cache for `"search-battery"` key
3. If cached (< 15 min), returns cached data
4. Otherwise, constructs search URLs for all vendors:
   - GetFPV: `/catalogsearch/result/?q=battery`
   - Others: `/search?q=battery`
5. Fetches all search pages in parallel
6. Parses results, normalizes, sorts by price
7. Caches with search-specific key and returns

### Error Handling
- Failed vendors are tracked separately
- Successful vendors still return results
- Each failed vendor shows:
  - Vendor name
  - Error message
  - Direct URL to attempt manual access

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
