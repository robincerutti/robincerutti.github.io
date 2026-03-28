#!/bin/bash
node scripts/build-manifest.js
git add photos/ manifest.json index.html
git diff-index --quiet HEAD || git commit -m "${1:-deploy}"
git checkout main
git merge dev
git push
git checkout dev
echo "✓ En ligne sur main"
