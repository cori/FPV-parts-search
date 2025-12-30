/**
 * FPV Deal Hunter - Val.town HTTP Handler
 * Aggregates clearance deals from multiple FPV vendors
 */

import { fetchAllVendors } from "./fetcher.js";

/**
 * Dashboard HTML template
 */
function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FPV Deal Hunter</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/alpinejs/3.12.0/cdn.min.js" defer></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #111827; }
        [x-cloak] { display: none !important; }
    </style>
</head>
<body class="text-gray-100 min-h-screen p-4 sm:p-8" x-data="dealApp()">
    <div class="max-w-7xl mx-auto">
        <header class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">FPV Deal Hunter</h1>
                <p class="text-gray-400 text-sm mt-1">Running on Val.town</p>
            </div>
            <div class="flex gap-2">
                <span class="px-3 py-2 bg-gray-800 rounded text-sm border border-gray-700">
                    Items: <span x-text="deals.length" class="font-bold text-white">...</span>
                </span>
                <span class="px-3 py-2 bg-gray-800 rounded text-sm border border-gray-700" x-show="cached">
                    <i class="fa-solid fa-database text-blue-400"></i> Cached
                </span>
                <button @click="refreshData()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors shadow-lg">
                    <i class="fa-solid fa-sync mr-2" :class="loading ? 'fa-spin' : ''"></i> Refresh
                </button>
            </div>
        </header>

        <!-- Failed vendors notice -->
        <div x-show="failed.length > 0" class="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 mb-6">
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-exclamation-triangle text-yellow-500 text-xl mt-1"></i>
                <div class="flex-1">
                    <h3 class="font-semibold text-yellow-300 mb-2">Some vendors couldn't be reached</h3>
                    <ul class="space-y-1 text-sm">
                        <template x-for="item in failed" :key="item.vendor">
                            <li class="text-gray-300">
                                <strong x-text="item.vendor"></strong>:
                                <span x-text="item.error" class="text-yellow-200"></span>
                                <a :href="item.url" target="_blank" class="text-blue-400 hover:underline ml-2">
                                    <i class="fa-solid fa-external-link-alt text-xs"></i> Visit store
                                </a>
                            </li>
                        </template>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Search and Filters -->
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg mb-8">
            <!-- Backend Search -->
            <div class="mb-4">
                <form @submit.prevent="performSearch()" class="flex gap-2">
                    <div class="relative flex-1">
                        <i class="fa-solid fa-search absolute left-3 top-3 text-gray-500"></i>
                        <input
                            type="text"
                            x-model="searchInput"
                            placeholder="Search all vendors (e.g., 'battery', 'camera', '5 inch frame')..."
                            class="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            @keydown.enter.prevent="performSearch()"
                        >
                    </div>
                    <button
                        type="submit"
                        class="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors shadow-lg whitespace-nowrap"
                        :disabled="loading"
                    >
                        <i class="fa-solid fa-search mr-2"></i>Search
                    </button>
                    <button
                        type="button"
                        @click="clearSearch()"
                        x-show="currentSearch"
                        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                    >
                        <i class="fa-solid fa-times"></i>
                    </button>
                </form>
                <div x-show="currentSearch" class="mt-2 text-sm text-gray-400">
                    Searching for: <span class="text-emerald-400 font-semibold" x-text="currentSearch"></span>
                </div>
                <div x-show="!currentSearch" class="mt-2 text-sm text-gray-500">
                    <i class="fa-solid fa-info-circle mr-1"></i> Showing clearance items. Enter a search term to browse full catalogs.
                </div>
            </div>

            <!-- Client-side Filters -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="relative">
                    <i class="fa-solid fa-filter absolute left-3 top-3 text-gray-500"></i>
                    <input type="text" x-model="filterText" placeholder="Filter results..." class="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                </div>
                <div>
                    <select x-model="sortBy" class="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <option value="priceLow">Price: Low to High</option>
                        <option value="priceHigh">Price: High to Low</option>
                        <option value="vendor">Sort by Vendor</option>
                    </select>
                </div>
                <div>
                    <select x-model="vendorFilter" class="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <option value="all">All Vendors</option>
                        <template x-for="v in vendorsList" :key="v"><option :value="v" x-text="v"></option></template>
                    </select>
                </div>
            </div>
        </div>

        <!-- Product Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            <template x-for="item in filteredDeals" :key="item.link">
                <a :href="item.link" target="_blank" class="group block bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-blue-500 transition-all hover:-translate-y-1 shadow-lg flex flex-col h-full relative">
                    <div class="aspect-square w-full bg-white p-2 flex items-center justify-center relative overflow-hidden">
                        <img :src="item.image" loading="lazy" class="max-h-full max-w-full object-contain transition-transform group-hover:scale-110" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">
                        <span class="absolute top-2 right-2 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm uppercase tracking-wider" x-text="item.vendor"></span>
                    </div>
                    <div class="p-4 flex flex-col flex-grow">
                        <h3 class="text-sm font-medium text-gray-200 line-clamp-2 mb-2 group-hover:text-blue-400 transition-colors" x-text="item.title"></h3>
                        <div class="mt-auto pt-2 flex justify-between items-center border-t border-gray-700/50">
                            <span class="text-lg font-bold text-emerald-400" x-text="item.price_str"></span>
                            <span class="text-xs text-gray-500">View &rarr;</span>
                        </div>
                    </div>
                </a>
            </template>
        </div>

        <!-- Loading overlay -->
        <div x-show="loading" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div class="bg-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
                <i class="fa-solid fa-satellite-dish fa-spin text-5xl text-blue-500 mb-4"></i>
                <h2 class="text-xl font-bold text-white">Scanning Vendors...</h2>
                <p class="text-gray-400 text-sm mt-2">Fetching the best deals</p>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('alpine:init', () => {
            Alpine.data('dealApp', () => ({
                deals: [],
                failed: [],
                cached: false,
                loading: true,
                searchInput: '',
                currentSearch: '',
                filterText: '',
                sortBy: 'priceLow',
                vendorFilter: 'all',
                get vendorsList() { return [...new Set(this.deals.map(d => d.vendor))].sort(); },
                get filteredDeals() {
                    let result = this.deals;
                    if (this.vendorFilter !== 'all') result = result.filter(d => d.vendor === this.vendorFilter);
                    if (this.filterText) {
                        const q = this.filterText.toLowerCase();
                        result = result.filter(d => d.title.toLowerCase().includes(q));
                    }
                    return result.sort((a, b) => {
                        if (this.sortBy === 'priceLow') return a.price_val - b.price_val;
                        if (this.sortBy === 'priceHigh') return b.price_val - a.price_val;
                        if (this.sortBy === 'vendor') return a.vendor.localeCompare(b.vendor);
                        return 0;
                    });
                },
                async init() { await this.loadDeals(); },
                async loadDeals(query = '') {
                    this.loading = true;
                    try {
                        const url = query ? '/api/deals?q=' + encodeURIComponent(query) : '/api/deals';
                        const res = await fetch(url);
                        if(res.ok) {
                            const data = await res.json();
                            this.deals = data.deals;
                            this.failed = data.failed || [];
                            this.cached = data.cached || false;
                            this.currentSearch = query;
                        }
                    } catch (e) {
                        console.error(e);
                    }
                    finally {
                        this.loading = false;
                    }
                },
                async performSearch() {
                    const query = this.searchInput.trim();
                    await this.loadDeals(query);
                },
                async clearSearch() {
                    this.searchInput = '';
                    this.currentSearch = '';
                    await this.loadDeals();
                },
                async refreshData() {
                    await this.loadDeals(this.currentSearch);
                }
            }))
        })
    </script>
</body>
</html>`;
}

/**
 * Main HTTP handler for Val.town
 * @param {Request} req - HTTP request
 * @returns {Response} HTTP response
 */
export default async function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS headers for API access
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Route: Dashboard
  if (path === "/" || path === "") {
    return new Response(getDashboardHTML(), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  // Route: API - Get deals
  if (path === "/api/deals") {
    try {
      const searchQuery = url.searchParams.get("q") || "";
      const skipCache = url.searchParams.get("refresh") === "true";
      const data = await fetchAllVendors(searchQuery, skipCache);

      return new Response(JSON.stringify(data), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=900", // 15 minutes
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message, deals: [], failed: [] }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  }

  // 404 for unknown routes
  return new Response("Not Found", { status: 404 });
}
