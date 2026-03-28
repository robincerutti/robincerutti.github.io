#!/bin/bash
node scripts/build-manifest.js
git add photos/ manifest.json index.html
git commit -m "${1:-update}"
echo "✓ Dev sauvegardé"
