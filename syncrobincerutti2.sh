#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "→ Build manifest..."
node ./scripts/build-manifest.js

echo "→ Build Astro..."
npm run build

echo "→ Copie manifest.json → dist/..."
cp manifest.json dist/manifest.json

echo "→ Déploiement Cloudflare Pages..."
wrangler pages deploy dist/ --project-name robincerutti-v2 --branch main

echo "✓ En ligne sur robincerutti-v2.pages.dev"
