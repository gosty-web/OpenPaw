#!/bin/bash
set -e
echo "🐾 OpenPaw Installer"
echo "===================="

# Check Node 20+
node_version=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$node_version" ] || [ "$node_version" -lt "20" ] 2>/dev/null; then
  echo "❌ Node.js 20+ required. Install from nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Clone or download (support both)
if command -v git &> /dev/null; then
  git clone https://github.com/YOUR_USERNAME/openpaw.git ~/.openpaw-install 2>/dev/null || true
fi

# Install dependencies
npm run setup --prefix ~/.openpaw-install
# npm link the CLI
npm link --prefix ~/.openpaw-install/apps/cli

echo ""
echo "✅ OpenPaw installed! Run: openpaw"
