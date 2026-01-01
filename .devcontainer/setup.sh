#!/bin/bash
set -e

echo "🚀 Setting up FPV Parts Search development environment..."

# Install Val.town CLI globally
echo "📦 Installing Val.town CLI..."
npm install -g @valtown/sdk

# Install val-town dependencies
echo "📦 Installing val-town dependencies..."
cd val-town && npm install

# Create helpful aliases
echo "⚙️  Setting up aliases..."
cat >> ~/.bashrc << 'EOF'

# Val.town deployment aliases
alias vt='valtown'
alias vt-login='valtown login'
alias vt-deploy='cd $WORKSPACE_ROOT/val-town && valtown deploy'
alias vt-test='cd $WORKSPACE_ROOT/val-town && npm test'
alias vt-status='valtown whoami'

# Quick deploy script
alias deploy-fpv='cd $WORKSPACE_ROOT/val-town && bash deploy.sh'

echo "🎯 FPV Parts Search environment ready!"
echo "💡 Quick commands:"
echo "   vt-login    - Authenticate with Val.town"
echo "   vt-test     - Run tests"
echo "   deploy-fpv  - Deploy to Val.town"
echo "   vt-status   - Check authentication status"
EOF

# Make deploy script executable
chmod +x val-town/deploy.sh 2>/dev/null || true

echo "✅ Setup complete! Run 'source ~/.bashrc' or open a new terminal."
echo ""
echo "🔐 Next steps:"
echo "   1. Run: valtown login"
echo "   2. Run: cd val-town && npm test"
echo "   3. Run: bash deploy.sh"
