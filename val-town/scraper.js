import * as cheerio from "cheerio";

/**
 * Normalize price string to numeric value
 * Removes currency symbols, commas, and extracts numeric value
 */
export function normalizePrice(priceStr) {
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0.0 : value;
}

/**
 * Normalize URL to absolute format
 */
export function normalizeUrl(url, baseUrl) {
  if (url.startsWith("http")) {
    return url;
  }
  return `${baseUrl}${url}`;
}

/**
 * Normalize image URL handling various formats
 * - Protocol-relative URLs (//cdn.example.com)
 * - Relative URLs (/media/image.jpg)
 * - Absolute URLs (https://...)
 */
export function normalizeImageUrl(imgSrc, baseUrl) {
  if (!imgSrc) {
    return "https://via.placeholder.com/300x300?text=No+Image";
  }

  // Protocol-relative URL
  if (imgSrc.startsWith("//")) {
    return `https:${imgSrc}`;
  }

  // Absolute URL
  if (imgSrc.startsWith("http")) {
    return imgSrc;
  }

  // Relative URL
  if (baseUrl) {
    return `${baseUrl}${imgSrc}`;
  }

  return imgSrc;
}

/**
 * Parse vendor HTML response and extract deal items
 * Uses CSS selectors from vendor configuration
 */
export function parseVendorResponse(html, config) {
  const $ = cheerio.load(html);
  const deals = [];

  // Select all product cards
  const cards = $(config.selectors.card);

  cards.each((_, element) => {
    const $card = $(element);

    // Extract title - try to find first non-empty title
    let title = "Unknown";
    const titleElements = $card.find(config.selectors.title);
    for (let i = 0; i < titleElements.length; i++) {
      const text = $(titleElements[i]).text().trim();
      if (text && text.length > 0) {
        title = text;
        break;
      }
    }

    // Extract price
    const priceEl = $card.find(config.selectors.price).first();
    const priceStr = priceEl.text().trim() || "$0.00";
    const priceVal = normalizePrice(priceStr);

    // Skip items with no price
    if (priceVal === 0) {
      return;
    }

    // Extract link
    const linkEl = $card.find(config.selectors.link).first();
    const linkHref = linkEl.attr("href") || "#";
    const link = normalizeUrl(linkHref, config.base_url);

    // Extract image
    let imgSrc = "";
    const imgEl = $card.find(config.selectors.image).first();
    if (imgEl.length > 0) {
      // Try src, data-src, or srcset
      imgSrc = imgEl.attr("src") || imgEl.attr("data-src") || "";

      // Handle srcset if src is not available
      if (!imgSrc) {
        const srcset = imgEl.attr("srcset");
        if (srcset) {
          // Take first URL from srcset
          imgSrc = srcset.split(",")[0].split(" ")[0];
        }
      }
    }
    const image = normalizeImageUrl(imgSrc, config.base_url);

    deals.push({
      vendor: config.name,
      title,
      price_str: priceStr,
      price_val: priceVal,
      link,
      image,
    });
  });

  return deals;
}
