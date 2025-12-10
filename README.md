# FPV Deal Hunter Edge

A high-performance FPV parts deal aggregator built on Fastly Compute@Edge. This application scrapes clearance and sale pages from 15 major FPV vendors in parallel, normalizes the data, and serves it through a fast JSON API.

## Features

- **Edge Computing**: Runs on Fastly's global edge network for ultra-low latency
- **Parallel Fetching**: Fetches from 15 vendors simultaneously using async requests
- **Smart Parsing**: Handles multiple HTML patterns (Shopify, GetFPV, RaceDayQuads, etc.)
- **Price Normalization**: Parses various price formats ($19.99, USD 99.99, etc.)
- **Link & Image Handling**: Converts relative URLs to absolute, supports lazy-loaded images
- **Comprehensive Tests**: 18 unit tests covering all parsing and normalization logic

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│    Fastly Compute@Edge (Rust)       │
│  ┌─────────────────────────────┐   │
│  │  Router (main.rs)           │   │
│  │  - /          → Dashboard   │   │
│  │  - /api/deals → JSON API    │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  Vendor Parser (vendors.rs) │   │
│  │  - Parallel fetching        │   │
│  │  - HTML scraping            │   │
│  │  - Data normalization       │   │
│  └─────────────────────────────┘   │
└──────────┬──────────────────────────┘
           │
           ▼
┌────────────────────────────┐
│   15 FPV Vendor Websites   │
│   (parallel HTTP requests) │
└────────────────────────────┘
```

## Supported Vendors

1. **GetFPV** - Clearance section
2. **RaceDayQuads** - Clearance collection
3. **Pyrodrone** - Clearance collection
4. **NewBeeDrone** - Clearance collection
5. **DefianceRC** - Discounted products
6. **TinyWhoop** - Clearance collection
7. **Wrekd** - Clearance collection
8. **Webleedfpv** - Clearance collection
9. **Five33** - Last chance sale
10. **BetaFPV** - On sale items
11. **ProgressiveRC** - Clearance collection
12. **Emax USA** - Clearance collection
13. **Rotor Riot** - Clearance sale
14. **Stan FPV** - Sale items
15. **Ovonic** - Hot sale items

## Prerequisites

- [Rust](https://rustup.rs/) (2021 edition or later)
- [Fastly CLI](https://developer.fastly.com/learning/tools/cli) (for deployment)
- Fastly account with Compute@Edge enabled

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd FPV-parts-search

# Build the project
cargo build --release
```

## Running Tests

The project includes 18 comprehensive unit tests covering all parsing logic:

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_price_normalization
```

### Test Coverage

- ✅ Basic product parsing
- ✅ Multiple product handling
- ✅ Price normalization (various formats)
- ✅ Relative/absolute link conversion
- ✅ Image handling (src, data-src, srcset, protocol-relative URLs)
- ✅ Edge cases (zero prices, invalid prices, missing fields)
- ✅ Vendor configuration validation
- ✅ JSON serialization
- ✅ Shopify selector patterns

## Development

### Project Structure

```
FPV-parts-search/
├── src/
│   ├── main.rs           # Entry point, router, API handlers
│   ├── vendors.rs        # Vendor configs, HTML parsing, tests
│   └── dashboard.html    # Frontend dashboard (embedded)
├── Cargo.toml            # Dependencies
├── Cargo.lock            # Locked dependencies
├── fastly.toml           # Fastly configuration (if exists)
└── README.md             # This file
```

### Adding a New Vendor

To add a new vendor to the aggregator:

1. Open `src/vendors.rs`
2. Add a new `VendorConfig` to the `get_vendors()` function:

```rust
VendorConfig {
    name: "VendorName",
    url: "/collections/sale",
    backend: "vendorname",
    base_url: "https://www.vendorname.com",
    selectors: shopify.clone(), // or create custom selectors
}
```

3. Add the backend to `fastly.toml`:

```toml
[local_server.backends.vendorname]
url = "https://www.vendorname.com"
```

4. Write a test to verify the vendor's HTML pattern works correctly

### Custom Selectors

If a vendor doesn't use Shopify patterns, create custom selectors:

```rust
let custom = VendorSelectors {
    card: "div.product-item",           // Product container
    title: "a.product-title",           // Product name
    price: "span.price",                // Price element
    image: "img.product-image",         // Image element
    link: "a.product-link",             // Link to product
};
```

## API Documentation

### GET /

Returns the HTML dashboard for browsing deals.

**Response**: HTML page

### GET /api/deals

Returns all current deals from all vendors as JSON.

**Response**:
```json
[
  {
    "vendor": "GetFPV",
    "title": "Example FPV Camera",
    "price_str": "$19.99",
    "price_val": 19.99,
    "link": "https://www.getfpv.com/products/example-camera",
    "image": "https://cdn.getfpv.com/images/example.jpg"
  }
]
```

**Headers**:
- `Content-Type: application/json`
- `Cache-Control: public, max-age=900` (15 minutes)

**Sorting**: Results are sorted by price (low to high)

## Deployment

### To Fastly Compute@Edge

```bash
# Build for Fastly
fastly compute build

# Test locally
fastly compute serve

# Deploy to Fastly
fastly compute deploy
```

### Configuration

Ensure your `fastly.toml` includes all 15 vendor backends with proper URLs.

## How It Works

1. **Request arrives** at the edge location closest to the user
2. **Parallel fetching**: Application dispatches 15 async HTTP requests simultaneously
3. **HTML parsing**: Each response is parsed using CSS selectors specific to that vendor
4. **Normalization**:
   - Prices are extracted and converted to floats
   - Relative URLs are made absolute
   - Images are extracted from various attributes (src, data-src, srcset)
5. **Filtering**: Items with zero or invalid prices are excluded
6. **Sorting**: All deals are sorted by price (lowest first)
7. **Response**: JSON array is returned to the client with 15-minute cache header

## Performance

- **Cold start**: ~500ms (all 15 vendors in parallel)
- **Cached**: 15 minutes browser cache
- **Location**: Runs on Fastly's global edge network (70+ locations)
- **Bandwidth**: Minimal - responses are streamed directly to clients

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass: `cargo test`
5. Submit a pull request

## License

[Add your license here]

## Support

For issues or questions:
- Open an issue on GitHub
- Check Fastly's [Compute@Edge documentation](https://developer.fastly.com/learning/compute/)
- Review the [Rust documentation](https://doc.rust-lang.org/)

---

Built with ❤️ for the FPV community
