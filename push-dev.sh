#!/bin/bash
node scripts/build-manifest.js
git add photos/ manifest.json index.html scripts/ public/CNAME .github/ src/
git diff-index --quiet HEAD || git commit -m "${1:-update}"
git push origin dev
echo "✓ Sauvegardé sur dev"
echo "  → Preview local : npx serve . (puis ouvrir http://localhost:3000)"
