#!/bin/bash
node scripts/build-manifest.js
git add photos/ manifest.json index.html data.json scripts/
git diff-index --quiet HEAD || git commit -m "${1:-deploy}"
git checkout main
git merge -X theirs dev
git checkout dev -- manifest.json
git add manifest.json
git diff-index --quiet HEAD || git commit -m "fix manifest"
git push
git checkout dev
echo "✓ En ligne sur main"
