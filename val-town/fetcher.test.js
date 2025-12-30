import { test } from "node:test";
import assert from "node:assert";
import { fetchAllVendors, fetchVendor } from "./fetcher.js";
import { VENDORS } from "./vendors.js";
import { clearCache } from "./cache.js";

// Mock fetch for testing
const originalFetch = global.fetch;

function mockFetch(responses) {
  let callIndex = 0;
  global.fetch = async (url, options) => {
    const response = responses[callIndex++];
    if (response.error) {
      throw new Error(response.error);
    }
    return {
      ok: response.ok !== false,
      status: response.status || 200,
      text: async () => response.body || "",
    };
  };
}

function restoreFetch() {
  global.fetch = originalFetch;
  clearCache(); // Clear cache after each test
}

test("fetchVendor - successfully fetches and parses deals", async () => {
  const vendor = VENDORS[0];
  const mockHTML = `
    <li class="product-item">
      <a class="product-item-link" href="/test">Test Product</a>
      <span class="price">$25.00</span>
      <a class="product-item-photo" href="/test">
        <img class="product-image-photo" src="/test.jpg">
      </a>
    </li>
  `;

  mockFetch([{ ok: true, body: mockHTML }]);

  const result = await fetchVendor(vendor);

  assert.strictEqual(result.vendor, vendor.name);
  assert.strictEqual(result.deals.length, 1);
  assert.strictEqual(result.deals[0].title, "Test Product");
  assert.strictEqual(result.deals[0].price_val, 25.0);
  assert.strictEqual(result.error, undefined);

  restoreFetch();
});

test("fetchVendor - handles fetch errors gracefully", async () => {
  const vendor = VENDORS[0];

  mockFetch([{ error: "Network error" }]);

  const result = await fetchVendor(vendor);

  assert.strictEqual(result.vendor, vendor.name);
  assert.strictEqual(result.deals.length, 0);
  assert.ok(result.error.includes("Network error"));
  assert.strictEqual(result.url, vendor.base_url + vendor.url);

  restoreFetch();
});

test("fetchVendor - handles non-200 responses", async () => {
  const vendor = VENDORS[0];

  mockFetch([{ ok: false, status: 404, body: "Not Found" }]);

  const result = await fetchVendor(vendor);

  assert.strictEqual(result.vendor, vendor.name);
  assert.strictEqual(result.deals.length, 0);
  assert.ok(result.error.includes("404"));

  restoreFetch();
});

test("fetchAllVendors - fetches from all vendors in parallel", async () => {
  // Mock responses for all vendors (VENDORS array length)
  const mockResponses = VENDORS.map(() => ({
    ok: true,
    body: `
      <li class="product-item">
        <a class="product-item-link" href="/test">Product</a>
        <span class="price">$10.00</span>
        <a class="product-item-photo" href="/test">
          <img class="product-image-photo" src="/test.jpg">
        </a>
      </li>
    `,
  }));

  mockFetch(mockResponses);

  const result = await fetchAllVendors();

  assert.ok(Array.isArray(result.deals));
  assert.ok(Array.isArray(result.failed));
  assert.ok(result.deals.length > 0, "Should have some deals");
  assert.strictEqual(result.failed.length, 0, "Should have no failures");
  assert.strictEqual(result.cached, false);
  assert.ok(result.timestamp > 0);

  restoreFetch();
});

test("fetchAllVendors - reports failed vendors", async () => {
  // Mock responses: first 3 succeed, rest fail
  const mockResponses = [
    { ok: true, body: '<li class="product-item"><a class="product-item-link" href="/test">Product</a><span class="price">$10.00</span><a class="product-item-photo" href="/test"><img class="product-image-photo" src="/test.jpg"></a></li>' },
    { ok: true, body: '<li class="product-item"><a class="product-item-link" href="/test">Product</a><span class="price">$10.00</span><a class="product-item-photo" href="/test"><img class="product-image-photo" src="/test.jpg"></a></li>' },
    { ok: true, body: '<li class="product-item"><a class="product-item-link" href="/test">Product</a><span class="price">$10.00</span><a class="product-item-photo" href="/test"><img class="product-image-photo" src="/test.jpg"></a></li>' },
    { error: "Timeout" },
    { error: "DNS error" },
    { ok: false, status: 500 },
    { error: "Network error" },
  ];

  mockFetch(mockResponses);

  const result = await fetchAllVendors();

  assert.strictEqual(result.failed.length, 4, "Should have 4 failed vendors");
  assert.ok(result.deals.length > 0, "Should still have deals from successful vendors");

  // Check failed vendor structure
  result.failed.forEach((failure) => {
    assert.ok(failure.vendor);
    assert.ok(failure.error);
    assert.ok(failure.url);
  });

  restoreFetch();
});

test("fetchAllVendors - sorts deals by price", async () => {
  // Generate appropriate HTML for each vendor type
  // Vendor 0: GetFPV (li.product-item), Vendor 1: RDQ (div.product-item), Vendors 2-6: Shopify (.product-card)
  const mockResponses = [
    { ok: true, body: '<li class="product-item"><a class="product-item-link" href="/test">Expensive</a><span class="price">$100.00</span><a class="product-item-photo" href="/test"><img class="product-image-photo" src="/test.jpg"></a></li>' },
    { ok: true, body: '<div class="product-item"><a class="product-item__title" href="/test">Cheap</a><span class="price">$5.00</span><div class="product-item__image-wrapper"><img src="/test.jpg"></div></div>' },
    { ok: true, body: '<div class="product-card"><div class="card__heading"><a href="/test" class="full-unstyled-link">Medium</a></div><div class="card__media"><img src="/test.jpg"></div><span class="price-item price-item--sale">$50.00</span></div>' },
    { ok: true, body: "" },
    { ok: true, body: "" },
    { ok: true, body: "" },
    { ok: true, body: "" },
  ];

  mockFetch(mockResponses);

  const result = await fetchAllVendors();

  // Check that deals are sorted by price ascending
  assert.ok(result.deals.length >= 3, `Expected at least 3 deals, got ${result.deals.length}`);
  assert.strictEqual(result.deals[0].price_val, 5.0);
  assert.strictEqual(result.deals[1].price_val, 50.0);
  assert.strictEqual(result.deals[2].price_val, 100.0);

  restoreFetch();
});
