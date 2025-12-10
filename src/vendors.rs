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