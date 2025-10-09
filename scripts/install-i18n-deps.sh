#!/bin/bash
# Install dependencies needed for i18n tooling

echo "📦 Installing i18n tooling dependencies..."

# Install eslint-plugin-i18next
cd frontend
npm install --save-dev eslint-plugin-i18next

# Install glob for extraction scripts
cd ..
npm install --save-dev glob @types/node ts-node

echo "✅ Dependencies installed!"
echo ""
echo "📝 Next steps:"
echo "1. Run: npm run generate:i18n-types"
echo "2. Run: npm run extract:i18n-keys"
echo "3. Run: npm run check:i18n-keys"
