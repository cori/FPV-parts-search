use fastly::{Error, Request, Response, Body};
use fastly::http::{Method, StatusCode};
use serde_json::json;
use std::time::Duration;

mod vendors;
use vendors::{get_vendors, parse_vendor_response, DealItem};

const DASHBOARD_HTML: &str = include_str!("dashboard.html");

#[fastly::main]
fn main(req: Request) -> Result<Response, Error> {
    // 1. Router
    match (req.get_method(), req.get_path()) {
        (&Method::GET, "/") => serve_dashboard(),
        (&Method::GET, "/api/deals") => serve_deals(req),
        _ => Ok(Response::from_status(StatusCode::NOT_FOUND).with_body("404 Not Found")),
    }
}

fn serve_dashboard() -> Result<Response, Error> {
    Ok(Response::from_status(StatusCode::OK)
        .with_content_type(fastly::mime::TEXT_HTML_UTF_8)
        .with_body(DASHBOARD_HTML))
}

fn serve_deals(req: Request) -> Result<Response, Error> {
    // 2. Cache Check (Simple read-through cache)
    // We use the URL as the cache key.
    // In Fastly, we usually cache based on origin headers, but for this aggregated API, 
    // we can use the Transaction Cache if we forward to a dummy backend, OR just re-fetch.
    // Since we can't easily "store" data in Wasm memory between requests, we rely on Fastly's Request Collapsing
    // or just fetch fresh. 15 requests in parallel is very fast on the edge (~500ms).
    
    // To implement real caching without an origin, we'd typically use a KV store or Config Store.
    // For this demo, we will Fetch Fresh (Live) every time because that's the "Deal Hunter" promise.
    // Fastly's bandwidth is huge; fetching 15 pages is trivial.

    fetch_all_vendors()
}

fn fetch_all_vendors() -> Result<Response, Error> {
    let vendors_list = get_vendors();
    let mut pending_requests = Vec::new();

    // 3. Dispatch Parallel Requests
    for v in &vendors_list {
        let req = Request::get(v.url)
            .with_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36")
            .with_header("Accept", "text/html,application/xhtml+xml")
            // We strip encodings to make parsing easier (text/plain response)
            .with_header("Accept-Encoding", "identity");

        // Send Async - This starts the request but doesn't wait yet
        pending_requests.push(req.send_async(v.backend));
    }

    // 4. Collect Responses
    let mut all_deals: Vec<DealItem> = Vec::new();
    
    // We wait for all of them. 
    // Fastly's `poll` logic happens when we try to wait on the PendingRequest.
    for (i, pending) in pending_requests.into_iter().enumerate() {
        let config = &vendors_list[i];
        
        match pending?.wait() {
            Ok(mut resp) => {
                if resp.get_status().is_success() {
                    let html = resp.take_body_str();
                    let items = parse_vendor_response(&html, config);
                    all_deals.extend(items);
                } else {
                    println!("Vendor {} returned status {}", config.name, resp.get_status());
                }
            },
            Err(e) => println!("Error fetching {}: {:?}", config.name, e),
        }
    }

    // 5. Sort Default (Price Low -> High)
    all_deals.sort_by(|a, b| a.price_val.partial_cmp(&b.price_val).unwrap());

    // 6. Return JSON
    Ok(Response::from_status(StatusCode::OK)
        .with_content_type(fastly::mime::APPLICATION_JSON)
        .with_header("Cache-Control", "public, max-age=900") // Cache for 15 mins
        .with_body(serde_json::to_string(&all_deals)?))
}