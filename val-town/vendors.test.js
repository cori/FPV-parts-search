import { test } from "node:test";
import assert from "node:assert";
import { VENDORS, buildVendorUrl, getVendorByName } from "./vendors.js";

test("VENDORS array includes all expected vendors", () => {
  assert.strictEqual(VENDORS.length, 7);

  const vendorNames = VENDORS.map(v => v.name);
  assert.ok(vendorNames.includes("GetFPV"));
  assert.ok(vendorNames.includes("RaceDayQuads"));
  assert.ok(vendorNames.includes("Pyrodrone"));
  assert.ok(vendorNames.includes("NewBeeDrone"));
  assert.ok(vendorNames.includes("TinyWhoop"));
  assert.ok(vendorNames.includes("RotorRiot"));
  assert.ok(vendorNames.includes("Webleedfpv"));
});

test("All vendors have required fields", () => {
  VENDORS.forEach(vendor => {
    assert.ok(vendor.name, `${vendor.name} should have name`);
    assert.ok(vendor.url, `${vendor.name} should have url`);
    assert.ok(vendor.searchUrl, `${vendor.name} should have searchUrl`);
    assert.ok(vendor.base_url, `${vendor.name} should have base_url`);
    assert.ok(vendor.selectors, `${vendor.name} should have selectors`);
  });
});

test("buildVendorUrl - returns clearance URL when no search query", () => {
  const vendor = getVendorByName("Pyrodrone");
  const url = buildVendorUrl(vendor);

  assert.strictEqual(url, "https://pyrodrone.com/collections/clearance");
});

test("buildVendorUrl - returns search URL when query provided", () => {
  const vendor = getVendorByName("Pyrodrone");
  const url = buildVendorUrl(vendor, "battery");

  assert.strictEqual(url, "https://pyrodrone.com/search?q=battery");
});

test("buildVendorUrl - encodes special characters in search query", () => {
  const vendor = getVendorByName("NewBeeDrone");
  const url = buildVendorUrl(vendor, "5 inch frame");

  assert.strictEqual(url, "https://newbeedrone.com/search?q=5%20inch%20frame");
});

test("buildVendorUrl - handles GetFPV different search pattern", () => {
  const vendor = getVendorByName("GetFPV");
  const url = buildVendorUrl(vendor, "camera");

  assert.strictEqual(url, "https://www.getfpv.com/catalogsearch/result/?q=camera");
});

test("buildVendorUrl - empty string returns clearance URL", () => {
  const vendor = getVendorByName("TinyWhoop");
  const url = buildVendorUrl(vendor, "");

  assert.strictEqual(url, "https://www.tinywhoop.com/collections/clearance");
});

test("getVendorByName - finds vendor by name", () => {
  const vendor = getVendorByName("Webleedfpv");

  assert.ok(vendor);
  assert.strictEqual(vendor.name, "Webleedfpv");
  assert.strictEqual(vendor.base_url, "https://webleedfpv.com");
});

test("getVendorByName - returns undefined for unknown vendor", () => {
  const vendor = getVendorByName("NonExistent");

  assert.strictEqual(vendor, undefined);
});
