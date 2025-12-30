import { test } from "node:test";
import assert from "node:assert";
import handler from "./index.js";

test("handler - serves dashboard HTML on root path", async () => {
  const req = new Request("http://localhost/");
  const res = await handler(req);

  assert.strictEqual(res.status, 200);
  assert.ok(res.headers.get("Content-Type").includes("text/html"));

  const html = await res.text();
  assert.ok(html.includes("FPV Deal Hunter"));
  assert.ok(html.includes("Val.town"));
});

test("handler - serves dashboard HTML on empty path", async () => {
  const req = new Request("http://localhost");
  const res = await handler(req);

  assert.strictEqual(res.status, 200);
  assert.ok(res.headers.get("Content-Type").includes("text/html"));
});

test("handler - returns 404 for unknown paths", async () => {
  const req = new Request("http://localhost/unknown");
  const res = await handler(req);

  assert.strictEqual(res.status, 404);
});

test("handler - handles OPTIONS for CORS", async () => {
  const req = new Request("http://localhost/api/deals", { method: "OPTIONS" });
  const res = await handler(req);

  assert.strictEqual(res.status, 204);
  assert.ok(res.headers.get("Access-Control-Allow-Origin"));
});

test("handler - /api/deals returns JSON with deals structure", async () => {
  const req = new Request("http://localhost/api/deals");

  // This will make real fetches or use mocks if still active
  // For a true integration test, we'd need to mock fetch globally
  const res = await handler(req);

  assert.ok(res.status === 200 || res.status === 500); // May fail if no network
  assert.ok(res.headers.get("Content-Type").includes("application/json"));

  const data = await res.json();
  assert.ok(Array.isArray(data.deals));
  assert.ok(Array.isArray(data.failed));
  assert.ok(typeof data.cached === "boolean");
  assert.ok(typeof data.timestamp === "number");
});

test("handler - /api/deals respects refresh parameter", async () => {
  const req = new Request("http://localhost/api/deals?refresh=true");
  const res = await handler(req);

  assert.ok(res.status === 200 || res.status === 500);

  const data = await res.json();
  // When refresh=true, cached should be false
  assert.strictEqual(data.cached, false);
});
