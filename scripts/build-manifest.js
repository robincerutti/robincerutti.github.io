#!/usr/bin/env node
/**
 * build-manifest.js
 * Scans the photos/ directory and generates manifest.json
 * 
 * Directory structure → site structure:
 *   photos/portraits/           → top-level "PORTRAITS" section
 *   photos/projects/mirror/     → "PROJECTS" parent menu → "mirror" sub-section
 *   photos/commissioned/        → top-level "COMMISSIONED" section
 * 
 * Naming conventions:
 *   - Folder names become menu labels (auto-capitalized for top-level)
 *   - Photos are sorted alphabetically (prefix with 01- 02- to control order)
 *   - Caption = filename without extension & prefix number
 *     e.g. "01-mirror-2011.jpg" → caption "mirror 2011"
 * 
 * Run: node scripts/build-manifest.js
 */

const fs = require('fs');
const path = require('path');

const PHOTOS_DIR = path.join(__dirname, '..', 'photos');
const OUTPUT = path.join(__dirname, '..', 'manifest.json');
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

function isImage(file) {
  return EXTENSIONS.has(path.extname(file).toLowerCase());
}

function cleanCaption(filename) {
  // Remove extension
  let name = path.basename(filename, path.extname(filename));
  // Remove leading number prefix like "01-" or "01_"
  name = name.replace(/^\d+[-_]\s*/, '');
  // Replace dashes and underscores with spaces
  name = name.replace(/[-_]/g, ' ');
  return name;
}

function formatLabel(folderName) {
  // Remove leading number prefix like "01-" or "02_"
  let name = folderName.replace(/^\d+[-_]\s*/, '');
  // Replace dashes/underscores with spaces
  return name.replace(/[-_]/g, ' ');
}

function makeId(folderName) {
  // Strip numeric prefix for IDs too
  return folderName.replace(/^\d+[-_]\s*/, '');
}

function scanDirectory() {
  const sections = [];

  if (!fs.existsSync(PHOTOS_DIR)) {
    console.log('No photos/ directory found. Creating empty manifest.');
    fs.writeFileSync(OUTPUT, JSON.stringify({ sections }, null, 2));
    return;
  }

  const topEntries = fs.readdirSync(PHOTOS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const topDir of topEntries) {
    const topPath = path.join(PHOTOS_DIR, topDir.name);
    const subDirs = fs.readdirSync(topPath, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name));

    const topPhotos = fs.readdirSync(topPath)
      .filter(f => isImage(f))
      .sort();

    const topId = makeId(topDir.name);

    if (subDirs.length > 0) {
      // This is a parent menu (like "projects")
      const groupName = formatLabel(topDir.name).toUpperCase();

      if (topPhotos.length > 0) {
        sections.push({
          id: topId,
          label: formatLabel(topDir.name),
          type: 'photos',
          group: groupName,
          photos: topPhotos.map(f => ({
            url: `photos/${topDir.name}/${f}`,
            caption: cleanCaption(f)
          }))
        });
      }

      for (const subDir of subDirs) {
        const subPath = path.join(topPath, subDir.name);
        const subPhotos = fs.readdirSync(subPath)
          .filter(f => isImage(f))
          .sort();

        sections.push({
          id: `${topId}-${makeId(subDir.name)}`,
          label: formatLabel(subDir.name),
          type: 'photos',
          group: groupName,
          photos: subPhotos.map(f => ({
            url: `photos/${topDir.name}/${subDir.name}/${f}`,
            caption: cleanCaption(f)
          }))
        });
      }
    } else {
      sections.push({
        id: topId,
        label: formatLabel(topDir.name).toUpperCase(),
        type: 'photos',
        group: '',
        photos: topPhotos.map(f => ({
          url: `photos/${topDir.name}/${f}`,
          caption: cleanCaption(f)
        }))
      });
    }
  }

  const manifest = { 
    sections,
    generated: new Date().toISOString()
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2));
  
  const totalPhotos = sections.reduce((sum, s) => sum + s.photos.length, 0);
  console.log(`✓ manifest.json generated`);
  console.log(`  ${sections.length} sections, ${totalPhotos} photos`);
}

scanDirectory();
