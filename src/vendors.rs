use serde::Serialize;
use scraper::{Html, Selector};

#[derive(Debug, Clone, Serialize)]
pub struct DealItem {
    pub vendor: String,
    pub title: String,
    pub price_str: String,
    pub price_val: f64,
    pub link: String,
    pub image: String,
}

#[derive(Clone)]
pub struct VendorConfig {
    pub name: &'static str,
    pub url: &'static str,
    pub backend: &'static str, // Corresponds to fastly.toml backend name
    pub base_url: &'static str,
    pub selectors: VendorSelectors,
}

#[derive(Clone)]
pub struct VendorSelectors {
    pub card: &'static str,
    pub title: &'static str,
    pub price: &'static str,
    pub image: &'static str,
    pub link: &'static str,
}

pub fn get_vendors() -> Vec<VendorConfig> {
    let shopify = VendorSelectors {
        card: "div.grid-view-item, .product-card, .product-item, .card-wrapper, .product-grid-item",
        title: "div.grid-view-item__title, .card__heading, .product-item__title, .full-unstyled-link, .product-title, h3 a",
        price: "span.price-item--sale, span.price-item--regular, .price__current, .product-price__price, .money, .price",
        image: "img.grid-view-item__image, .card__media img, .product-item__image-wrapper img, .product-grid-image img",
        link: "a.grid-view-item__link, a.full-unstyled-link, .product-item__image-link, .product-card a",
    };

    let getfpv = VendorSelectors {
        card: "li.product-item",
        title: "a.product-item-link",
        price: "span.price",
        image: "img.product-image-photo",
        link: "a.product-item-photo",
    };

    let rdq = VendorSelectors {
        card: "div.product-item",
        title: "a.product-item__title",
        price: "span.price",
        image: "div.product-item__image-wrapper img",
        link: "a.product-item__title",
    };

    vec![
        VendorConfig { name: "GetFPV", url: "/on-sale/clearance.html?product_list_limit=100", backend: "getfpv", base_url: "https://www.getfpv.com", selectors: getfpv },
        VendorConfig { name: "RaceDayQuads", url: "/collections/clearance", backend: "racedayquads", base_url: "https://www.racedayquads.com", selectors: rdq },
        VendorConfig { name: "Pyrodrone", url: "/collections/clearance", backend: "pyrodrone", base_url: "https://pyrodrone.com", selectors: shopify.clone() },
        VendorConfig { name: "NewBeeDrone", url: "/collections/clearance", backend: "newbeedrone", base_url: "https://newbeedrone.com", selectors: shopify.clone() },
        VendorConfig { name: "DefianceRC", url: "/collections/discounted-products", backend: "defiancerc", base_url: "https://www.defiancerc.com", selectors: shopify.clone() },
        VendorConfig { name: "TinyWhoop", url: "/collections/clearance", backend: "tinywhoop", base_url: "https://www.tinywhoop.com", selectors: shopify.clone() },
        VendorConfig { name: "Wrekd", url: "/collections/clearance", backend: "wrekd", base_url: "https://wrekd.com", selectors: shopify.clone() },
        VendorConfig { name: "Webleedfpv", url: "/collections/clearance-1", backend: "webleedfpv", base_url: "https://webleedfpv.com", selectors: shopify.clone() },
        VendorConfig { name: "Five33", url: "/collections/last-chance-sale", backend: "five33", base_url: "https://flyfive33.com", selectors: shopify.clone() },
        VendorConfig { name: "BetaFPV", url: "/collections/on-sale", backend: "betafpv", base_url: "https://betafpv.com", selectors: shopify.clone() },
        VendorConfig { name: "ProgressiveRC", url: "/collections/clearance", backend: "progressiverc", base_url: "https://www.progressiverc.com", selectors: shopify.clone() },
        VendorConfig { name: "Emax USA", url: "/collections/clearance", backend: "emax", base_url: "https://emax-usa.com", selectors: shopify.clone() },
        VendorConfig { name: "Rotor Riot", url: "/collections/clearance-sale", backend: "rotorriot", base_url: "https://rotorriot.com", selectors: shopify.clone() },
        VendorConfig { name: "Stan FPV", url: "/collections/black-friday-cyber-monday-sale-items", backend: "stanfpv", base_url: "https://stanfpv.com", selectors: shopify.clone() },
        VendorConfig { name: "Ovonic", url: "/collections/hot-sale", backend: "ovonic", base_url: "https://us.ovonicshop.com", selectors: shopify.clone() },
    ]
}

pub fn parse_vendor_response(html: &str, config: &VendorConfig) -> Vec<DealItem> {
    let document = Html::parse_document(html);
    let card_selector = Selector::parse(config.selectors.card).unwrap();
    let title_selector = Selector::parse(config.selectors.title).unwrap();
    let price_selector = Selector::parse(config.selectors.price).unwrap();
    let link_selector = Selector::parse(config.selectors.link).unwrap();
    let image_selector = Selector::parse(config.selectors.image).unwrap();

    let mut deals = Vec::new();

    for element in document.select(&card_selector) {
        let title = element.select(&title_selector).next().map(|e| e.text().collect::<String>().trim().to_string()).unwrap_or("Unknown".to_string());
        
        let price_str = element.select(&price_selector).next().map(|e| e.text().collect::<String>().trim().to_string()).unwrap_or("$0.00".to_string());
        
        // Price Normalization
        let price_clean: String = price_str.chars().filter(|c| c.is_digit(10) || *c == '.').collect();
        let price_val = price_clean.parse::<f64>().unwrap_or(0.0);

        // Link Normalization
        let mut link = element.select(&link_selector).next().and_then(|e| e.value().attr("href")).unwrap_or("#").to_string();
        if !link.starts_with("http") {
            link = format!("{}{}", config.base_url, link);
        }

        // Image Normalization
        let mut image = "https://via.placeholder.com/300x300?text=No+Image".to_string();
        if let Some(img) = element.select(&image_selector).next() {
            if let Some(src) = img.value().attr("src").or(img.value().attr("data-src")).or(img.value().attr("srcset").map(|s| s.split(',').next().unwrap_or("").split(' ').next().unwrap_or(""))) {
                image = src.to_string();
                if image.starts_with("//") {
                    image = format!("https:{}", image);
                }
            }
        }

        if price_val > 0.0 {
            deals.push(DealItem {
                vendor: config.name.to_string(),
                title,
                price_str,
                price_val,
                link,
                image,
            });
        }
    }
    deals
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_vendor_config() -> VendorConfig {
        VendorConfig {
            name: "TestVendor",
            url: "/test",
            backend: "test_backend",
            base_url: "https://example.com",
            selectors: VendorSelectors {
                card: "div.product",
                title: "h2.title",
                price: "span.price",
                image: "img.product-img",
                link: "a.product-link",
            },
        }
    }

    #[test]
    fn test_parse_basic_product() {
        let html = r#"
            <div class="product">
                <h2 class="title">Test Product</h2>
                <span class="price">$19.99</span>
                <a class="product-link" href="/product/123"></a>
                <img class="product-img" src="https://example.com/image.jpg" />
            </div>
        "#;

        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals.len(), 1);
        assert_eq!(deals[0].vendor, "TestVendor");
        assert_eq!(deals[0].title, "Test Product");
        assert_eq!(deals[0].price_str, "$19.99");
        assert_eq!(deals[0].price_val, 19.99);
        assert_eq!(deals[0].link, "https://example.com/product/123");
        assert_eq!(deals[0].image, "https://example.com/image.jpg");
    }

    #[test]
    fn test_parse_multiple_products() {
        let html = r#"
            <div class="product">
                <h2 class="title">Product 1</h2>
                <span class="price">$10.00</span>
                <a class="product-link" href="/p1"></a>
                <img class="product-img" src="/img1.jpg" />
            </div>
            <div class="product">
                <h2 class="title">Product 2</h2>
                <span class="price">$25.50</span>
                <a class="product-link" href="/p2"></a>
                <img class="product-img" src="/img2.jpg" />
            </div>
        "#;

        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals.len(), 2);
        assert_eq!(deals[0].title, "Product 1");
        assert_eq!(deals[0].price_val, 10.0);
        assert_eq!(deals[1].title, "Product 2");
        assert_eq!(deals[1].price_val, 25.50);
    }

    #[test]
    fn test_price_normalization() {
        let test_cases = vec![
            ("$19.99", 19.99),
            ("$1,234.56", 1234.56),
            ("USD 99.99", 99.99),
            ("49", 49.0),
            ("From $29.99", 29.99),
            ("  $15.00  ", 15.0),
        ];

        for (price_str, expected_val) in test_cases {
            let html = format!(r#"
                <div class="product">
                    <h2 class="title">Test</h2>
                    <span class="price">{}</span>
                    <a class="product-link" href="/test"></a>
                    <img class="product-img" src="/test.jpg" />
                </div>
            "#, price_str);

            let config = create_test_vendor_config();
            let deals = parse_vendor_response(&html, &config);

            assert_eq!(deals.len(), 1, "Failed for price_str: {}", price_str);
            assert_eq!(deals[0].price_val, expected_val, "Failed for price_str: {}", price_str);
        }
    }

    #[test]
    fn test_relative_link_normalization() {
        let html = r#"
            <div class="product">
                <h2 class="title">Test Product</h2>
                <span class="price">$10.00</span>
                <a class="product-link" href="/products/test-item"></a>
                <img class="product-img" src="/test.jpg" />
            </div>
        "#;

        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals[0].link, "https://example.com/products/test-item");
    }

    #[test]
    fn test_absolute_link_no_change() {
        let html = r#"
            <div class="product">
                <h2 class="title">Test Product</h2>
                <span class="price">$10.00</span>
                <a class="product-link" href="https://other.com/product"></a>
                <img class="product-img" src="/test.jpg" />
            </div>
        "#;

        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals[0].link, "https://other.com/product");
    }

    #[test]
    fn test_image_with_data_src() {
        let html = r#"
            <div class="product">
                <h2 class="title">Test Product</h2>
                <span class="price">$10.00</span>
                <a class="product-link" href="/test"></a>
                <img class="product-img" data-src="https://example.com/lazy-image.jpg" />
            </div>
        "#;

        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals[0].image, "https://example.com/lazy-image.jpg");
    }

    #[test]
    fn test_image_with_protocol_relative_url() {
        let html = r#"
            <div class="product">
                <h2 class="title">Test Product</h2>
                <span class="price">$10.00</span>
                <a class="product-link" href="/test"></a>
                <img class="product-img" src="//cdn.example.com/image.jpg" />
            </div>
        "#;

        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals[0].image, "https://cdn.example.com/image.jpg");
    }

    #[test]
    fn test_missing_image_uses_placeholder() {
        let html = r#"
            <div class="product">
                <h2 class="title">Test Product</h2>
                <span class="price">$10.00</span>
                <a class="product-link" href="/test"></a>
            </div>
        "#;

        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals[0].image, "https://via.placeholder.com/300x300?text=No+Image");
    }

    #[test]
    fn test_zero_price_items_excluded() {
        let html = r#"
            <div class="product">
                <h2 class="title">Free Item</h2>
                <span class="price">$0.00</span>
                <a class="product-link" href="/test"></a>
                <img class="product-img" src="/test.jpg" />
            </div>
            <div class="product">
                <h2 class="title">Paid Item</h2>
                <span class="price">$5.00</span>
                <a class="product-link" href="/test2"></a>
                <img class="product-img" src="/test2.jpg" />
            </div>
        "#;

        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals.len(), 1);
        assert_eq!(deals[0].title, "Paid Item");
    }

    #[test]
    fn test_invalid_price_excluded() {
        let html = r#"
            <div class="product">
                <h2 class="title">Invalid Price</h2>
                <span class="price">Contact for price</span>
                <a class="product-link" href="/test"></a>
                <img class="product-img" src="/test.jpg" />
            </div>
        "#;

        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals.len(), 0);
    }

    #[test]
    fn test_missing_title_uses_default() {
        let html = r#"
            <div class="product">
                <span class="price">$10.00</span>
                <a class="product-link" href="/test"></a>
                <img class="product-img" src="/test.jpg" />
            </div>
        "#;

        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals.len(), 1);
        assert_eq!(deals[0].title, "Unknown");
    }

    #[test]
    fn test_missing_link_uses_hash() {
        let html = r#"
            <div class="product">
                <h2 class="title">Test Product</h2>
                <span class="price">$10.00</span>
                <img class="product-img" src="/test.jpg" />
            </div>
        "#;

        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals.len(), 1);
        assert_eq!(deals[0].link, "https://example.com#");
    }

    #[test]
    fn test_dealitem_serialization() {
        let deal = DealItem {
            vendor: "TestVendor".to_string(),
            title: "Test Product".to_string(),
            price_str: "$19.99".to_string(),
            price_val: 19.99,
            link: "https://example.com/product".to_string(),
            image: "https://example.com/image.jpg".to_string(),
        };

        let json = serde_json::to_string(&deal).unwrap();
        assert!(json.contains("TestVendor"));
        assert!(json.contains("Test Product"));
        assert!(json.contains("19.99"));
    }

    #[test]
    fn test_get_vendors_returns_expected_count() {
        let vendors = get_vendors();
        assert_eq!(vendors.len(), 15, "Expected 15 vendors configured");
    }

    #[test]
    fn test_vendors_have_valid_configuration() {
        let vendors = get_vendors();

        for vendor in vendors {
            assert!(!vendor.name.is_empty(), "Vendor name should not be empty");
            assert!(!vendor.url.is_empty(), "Vendor URL should not be empty");
            assert!(!vendor.backend.is_empty(), "Vendor backend should not be empty");
            assert!(vendor.base_url.starts_with("https://"), "Base URL should be HTTPS: {}", vendor.base_url);
            assert!(!vendor.selectors.card.is_empty(), "Card selector should not be empty");
            assert!(!vendor.selectors.title.is_empty(), "Title selector should not be empty");
            assert!(!vendor.selectors.price.is_empty(), "Price selector should not be empty");
        }
    }

    #[test]
    fn test_trim_whitespace_in_title_and_price() {
        let html = r#"
            <div class="product">
                <h2 class="title">
                    Test Product
                </h2>
                <span class="price">  $19.99  </span>
                <a class="product-link" href="/test"></a>
                <img class="product-img" src="/test.jpg" />
            </div>
        "#;

        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals[0].title, "Test Product");
        assert_eq!(deals[0].price_str, "$19.99");
    }

    #[test]
    fn test_empty_html_returns_empty_deals() {
        let html = "<html><body></body></html>";
        let config = create_test_vendor_config();
        let deals = parse_vendor_response(html, &config);

        assert_eq!(deals.len(), 0);
    }

    #[test]
    fn test_shopify_selector_pattern() {
        let html = r#"
            <div class="grid-view-item">
                <div class="grid-view-item__title">Shopify Product</div>
                <span class="price-item--sale">$29.99</span>
                <a class="grid-view-item__link" href="/products/test"></a>
                <img class="grid-view-item__image" src="/test.jpg" />
            </div>
        "#;

        let shopify_config = VendorConfig {
            name: "Shopify Test",
            url: "/test",
            backend: "test",
            base_url: "https://shopify.example.com",
            selectors: VendorSelectors {
                card: "div.grid-view-item, .product-card",
                title: "div.grid-view-item__title, .card__heading",
                price: "span.price-item--sale, span.price-item--regular",
                image: "img.grid-view-item__image, .card__media img",
                link: "a.grid-view-item__link, a.full-unstyled-link",
            },
        };

        let deals = parse_vendor_response(html, &shopify_config);

        assert_eq!(deals.len(), 1);
        assert_eq!(deals[0].title, "Shopify Product");
        assert_eq!(deals[0].price_val, 29.99);
    }
}