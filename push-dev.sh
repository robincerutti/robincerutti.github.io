#!/bin/bash
node scripts/build-manifest.js
git add photos/ manifest.json index.html
git commit -m "${1:-update}"
git push origin dev
echo "✓ Dev en ligne sur rob1dev.netlify.app"
