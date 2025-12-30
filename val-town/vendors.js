/**
 * Vendor configuration for FPV deal scraping
 * Starting with popular independent vendors
 */

const shopifySelectors = {
  card:
    "div.grid-view-item, .product-card, .product-item, .card-wrapper, .product-grid-item",
  title:
    "div.grid-view-item__title, .card__heading, .product-item__title, .full-unstyled-link, .product-title, h3 a",
  price:
    "span.price-item--sale, span.price-item--regular, .price__current, .product-price__price, .money, .price",
  image:
    "img.grid-view-item__image, .card__media img, .product-item__image-wrapper img, .product-grid-image img",
  link:
    "a.grid-view-item__link, a.full-unstyled-link, .product-item__image-link, .product-card a",
};

const getfpvSelectors = {
  card: "li.product-item",
  title: "a.product-item-link",
  price: "span.price",
  image: "img.product-image-photo",
  link: "a.product-item-photo",
};

const rdqSelectors = {
  card: "div.product-item",
  title: "a.product-item__title",
  price: "span.price",
  image: "div.product-item__image-wrapper img",
  link: "a.product-item__title",
};

export const VENDORS = [
  {
    name: "GetFPV",
    url: "/on-sale/clearance.html?product_list_limit=100",
    searchUrl: "/catalogsearch/result/?q={query}",
    base_url: "https://www.getfpv.com",
    selectors: getfpvSelectors,
  },
  {
    name: "RaceDayQuads",
    url: "/collections/clearance",
    searchUrl: "/search?q={query}",
    base_url: "https://www.racedayquads.com",
    selectors: rdqSelectors,
  },
  {
    name: "Pyrodrone",
    url: "/collections/clearance",
    searchUrl: "/search?q={query}",
    base_url: "https://pyrodrone.com",
    selectors: shopifySelectors,
  },
  {
    name: "NewBeeDrone",
    url: "/collections/clearance",
    searchUrl: "/search?q={query}",
    base_url: "https://newbeedrone.com",
    selectors: shopifySelectors,
  },
  {
    name: "TinyWhoop",
    url: "/collections/clearance",
    searchUrl: "/search?q={query}",
    base_url: "https://www.tinywhoop.com",
    selectors: shopifySelectors,
  },
  {
    name: "RotorRiot",
    url: "/collections/clearance-sale",
    searchUrl: "/search?q={query}",
    base_url: "https://rotorriot.com",
    selectors: shopifySelectors,
  },
  {
    name: "Webleedfpv",
    url: "/collections/clearance-1",
    searchUrl: "/search?q={query}",
    base_url: "https://webleedfpv.com",
    selectors: shopifySelectors,
  },
];

export function getVendorByName(name) {
  return VENDORS.find((v) => v.name === name);
}

/**
 * Build URL for vendor based on search query
 * @param {Object} vendor - Vendor configuration
 * @param {string} searchQuery - Search term (empty for clearance)
 * @returns {string} Full URL to fetch
 */
export function buildVendorUrl(vendor, searchQuery = "") {
  const path = searchQuery
    ? vendor.searchUrl.replace("{query}", encodeURIComponent(searchQuery))
    : vendor.url;
  return vendor.base_url + path;
}
