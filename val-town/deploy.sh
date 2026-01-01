#!/bin/bash
# Deploy FPV Deal Hunter to Val.town
set -e

echo "🚀 Deploying FPV Deal Hunter to Val.town..."
echo ""

# Check if logged in
if ! valtown whoami &>/dev/null; then
    echo "❌ Not logged in to Val.town"
    echo "Please run: valtown login"
    exit 1
fi

USERNAME=$(valtown whoami | grep "Username:" | awk '{print $2}')
echo "📝 Deploying as: $USERNAME"
echo ""

# Run tests first
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed! Fix them before deploying."
    exit 1
fi
echo "✅ All tests passed!"
echo ""

# Deploy modules
echo "📦 Deploying modules..."

echo "  → Deploying cache.js..."
valtown deploy cache.js --name fpv-deal-hunter-cache --public

echo "  → Deploying vendors.js..."
valtown deploy vendors.js --name fpv-deal-hunter-vendors --public

echo "  → Deploying scraper.js..."
valtown deploy scraper.js --name fpv-deal-hunter-scraper --public

echo "  → Deploying fetcher.js..."
valtown deploy fetcher.js --name fpv-deal-hunter-fetcher --public

echo "  → Deploying main handler (index.js)..."
valtown deploy index.js --name fpv-deal-hunter --public

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your val should be live at:"
echo "   https://$USERNAME-fpv-deal-hunter.val.run"
echo ""
echo "⚠️  IMPORTANT: Update imports in index.js to reference your deployed vals:"
echo "   import { fetchAllVendors } from 'https://esm.town/v/$USERNAME/fpv-deal-hunter-fetcher';"
echo ""
echo "💡 To update an existing deployment, use:"
echo "   valtown deploy index.js --name fpv-deal-hunter --public"
