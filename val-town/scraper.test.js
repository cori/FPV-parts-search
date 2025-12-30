import { test } from "node:test";
import assert from "node:assert";
import { readFile } from "node:fs/promises";
import {
  parseVendorResponse,
  normalizePrice,
  normalizeUrl,
  normalizeImageUrl,
} from "./scraper.js";
import { VENDORS } from "./vendors.js";

// Load test fixtures
const shopifyHTML = await readFile("./fixtures/shopify-sample.html", "utf-8");
const getfpvHTML = await readFile("./fixtures/getfpv-sample.html", "utf-8");

test("normalizePrice - extracts numeric value from price string", () => {
  assert.strictEqual(normalizePrice("$29.99"), 29.99);
  assert.strictEqual(normalizePrice("$1,299.00"), 1299.0);
  assert.strictEqual(normalizePrice("45.50"), 45.5);
  assert.strictEqual(normalizePrice("Free"), 0.0);
  assert.strictEqual(normalizePrice(""), 0.0);
});

test("normalizeUrl - converts relative URLs to absolute", () => {
  const baseUrl = "https://example.com";
  assert.strictEqual(
    normalizeUrl("/products/test", baseUrl),
    "https://example.com/products/test"
  );
  assert.strictEqual(
    normalizeUrl("https://other.com/test", baseUrl),
    "https://other.com/test"
  );
  assert.strictEqual(normalizeUrl("#", baseUrl), "https://example.com#");
});

test("normalizeImageUrl - handles various image URL formats", () => {
  assert.strictEqual(
    normalizeImageUrl("//cdn.example.com/image.jpg"),
    "https://cdn.example.com/image.jpg"
  );
  assert.strictEqual(
    normalizeImageUrl("https://example.com/image.jpg"),
    "https://example.com/image.jpg"
  );
  assert.strictEqual(
    normalizeImageUrl("/media/image.jpg", "https://example.com"),
    "https://example.com/media/image.jpg"
  );
  assert.strictEqual(
    normalizeImageUrl("", "https://example.com"),
    "https://via.placeholder.com/300x300?text=No+Image"
  );
});

test("parseVendorResponse - parses Shopify HTML correctly", () => {
  const vendorConfig = VENDORS.find((v) => v.name === "Pyrodrone");
  const deals = parseVendorResponse(shopifyHTML, vendorConfig);

  assert.strictEqual(
    deals.length,
    2,
    "Should parse 2 valid products (ignoring no-price item)"
  );

  // Check first product
  assert.strictEqual(deals[0].vendor, "Pyrodrone");
  assert.strictEqual(deals[0].title, "RunCam Phoenix 2 - Clearance");
  assert.strictEqual(deals[0].price_val, 29.99);
  assert.strictEqual(deals[0].price_str, "$29.99");
  assert.strictEqual(deals[0].link, "https://pyrodrone.com/products/fpv-camera-1");
  assert.strictEqual(deals[0].image, "https://example.com/camera1.jpg");

  // Check second product
  assert.strictEqual(deals[1].title, "TBS Unify Pro 5G8 HV");
  assert.strictEqual(deals[1].price_val, 45.5);
  assert.strictEqual(deals[1].image, "https://cdn.example.com/vtx.jpg");
});

test("parseVendorResponse - parses GetFPV HTML correctly", () => {
  const vendorConfig = VENDORS.find((v) => v.name === "GetFPV");
  const deals = parseVendorResponse(getfpvHTML, vendorConfig);

  assert.strictEqual(deals.length, 2);

  // Check first product
  assert.strictEqual(deals[0].vendor, "GetFPV");
  assert.strictEqual(deals[0].title, "CNHL 4S 1500mAh LiPo Battery");
  assert.strictEqual(deals[0].price_val, 19.99);
  assert.strictEqual(deals[0].link, "https://www.getfpv.com/batteries/lipo-4s");

  // Check second product
  assert.strictEqual(deals[1].title, '5" Freestyle Frame Kit');
  assert.strictEqual(deals[1].price_val, 79.0);
});

test("parseVendorResponse - filters out zero-price items", () => {
  const vendorConfig = VENDORS.find((v) => v.name === "Pyrodrone");
  const deals = parseVendorResponse(shopifyHTML, vendorConfig);

  // Should not include the "Out of Stock Item" which has no price
  const hasZeroPrice = deals.some((d) => d.price_val === 0);
  assert.strictEqual(
    hasZeroPrice,
    false,
    "Should filter out items with zero price"
  );
});

test("parseVendorResponse - handles empty HTML", () => {
  const vendorConfig = VENDORS.find((v) => v.name === "Pyrodrone");
  const deals = parseVendorResponse("<html><body></body></html>", vendorConfig);

  assert.strictEqual(deals.length, 0);
});
