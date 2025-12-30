import { parseVendorResponse } from "./scraper.js";
import { VENDORS } from "./vendors.js";
import { getCache, setCache } from "./cache.js";

/**
 * User agent for polite scraping
 */
const USER_AGENT =
  "Mozilla/5.0 (compatible; FPV-Deal-Hunter/1.0; +https://github.com/yourhandle/fpv-deal-hunter)";

/**
 * Fetch deals from a single vendor
 * @param {Object} vendor - Vendor configuration
 * @returns {Promise<Object>} Result with deals array and optional error
 */
export async function fetchVendor(vendor) {
  const url = vendor.base_url + vendor.url;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      return {
        vendor: vendor.name,
        deals: [],
        error: `HTTP ${response.status}: ${response.statusText || "Error"}`,
        url,
      };
    }

    const html = await response.text();
    const deals = parseVendorResponse(html, vendor);

    return {
      vendor: vendor.name,
      deals,
      url,
    };
  } catch (error) {
    return {
      vendor: vendor.name,
      deals: [],
      error: error.message || "Unknown error",
      url,
    };
  }
}

/**
 * Fetch deals from all vendors in parallel
 * @param {boolean} skipCache - Force fresh fetch, bypassing cache
 * @returns {Promise<Object>} Response with deals, failed vendors, and metadata
 */
export async function fetchAllVendors(skipCache = false) {
  const CACHE_KEY = "all-deals";

  // Check cache first
  if (!skipCache) {
    const cached = getCache(CACHE_KEY);
    if (cached) {
      return {
        ...cached,
        cached: true,
      };
    }
  }

  const startTime = Date.now();

  // Fetch from all vendors in parallel
  const results = await Promise.all(VENDORS.map((vendor) => fetchVendor(vendor)));

  // Separate successful and failed fetches
  const deals = [];
  const failed = [];

  for (const result of results) {
    if (result.error) {
      failed.push({
        vendor: result.vendor,
        error: result.error,
        url: result.url,
      });
    } else {
      deals.push(...result.deals);
    }
  }

  // Sort deals by price (low to high)
  deals.sort((a, b) => a.price_val - b.price_val);

  const response = {
    deals,
    failed,
    cached: false,
    timestamp: startTime,
  };

  // Store in cache
  setCache(CACHE_KEY, response);

  return response;
}
