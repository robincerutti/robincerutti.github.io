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
const { execFileSync } = require('child_process');

const PHOTOS_DIR = path.join(__dirname, '..', 'photos');
const OUTPUT = path.join(__dirname, '..', 'manifest.json');
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const MAX_PX = 2000;

function isImage(file) {
  return EXTENSIONS.has(path.extname(file).toLowerCase());
}

function resizeIfNeeded(filePath) {
  try {
    const info = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', filePath], { encoding: 'utf8' });
    const w = parseInt(info.match(/pixelWidth: (\d+)/)?.[1] || '0');
    const h = parseInt(info.match(/pixelHeight: (\d+)/)?.[1] || '0');
    if (w > MAX_PX || h > MAX_PX) {
      const tmpPath = filePath + '.__orig__';
      fs.copyFileSync(filePath, tmpPath);
      execFileSync('sips', ['-Z', String(MAX_PX), filePath], { stdio: 'ignore' });
      try {
        execFileSync('exiftool', ['-overwrite_original', '-TagsFromFile', tmpPath, '-all:all', filePath], { stdio: 'ignore' });
      } catch (e) { /* exiftool not available, metadata not restored */ }
      fs.unlinkSync(tmpPath);
      console.log(`  ↓ resized: ${path.basename(filePath)} (${w}×${h})`);
    }
  } catch (e) { /* skip if sips unavailable */ }
}

function cleanCaption(filename) {
  // Remove extension
  let name = path.basename(filename, path.extname(filename));
  // Remove leading number prefix like "01-" or "01_"
  name = name.replace(/^\d+[-_]\s*/, '');
  // If "--" separator present: everything before it is the caption, rest is ignored
  if (name.includes('--')) {
    const caption = name.split('--')[0].trim();
    return caption;
  }
  // No separator: return empty string (no caption displayed)
  return '';
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

function readDescription(folderPath) {
  for (const name of ['_description.txt', '_descriptions.txt']) {
    const file = path.join(folderPath, name);
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  }
  return '';
}

function sanitizeName(name) {
  // Decompose accented chars (é → e + combining accent) then strip combining marks
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function sanitizeFilenames(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const clean = sanitizeName(entry.name);
    if (clean !== entry.name) {
      const oldPath = path.join(dir, entry.name);
      const newPath = path.join(dir, clean);
      fs.renameSync(oldPath, newPath);
      console.log(`  ✎ renamed: ${entry.name} → ${clean}`);
    }
    if (entry.isDirectory()) {
      sanitizeFilenames(path.join(dir, entry.isDirectory() ? sanitizeName(entry.name) : entry.name));
    }
  }
}

function scanDirectory() {
  const sections = [];
  const groups = {};

  if (!fs.existsSync(PHOTOS_DIR)) {
    console.log('No photos/ directory found. Creating empty manifest.');
    fs.writeFileSync(OUTPUT, JSON.stringify({ sections }, null, 2));
    return;
  }

  sanitizeFilenames(PHOTOS_DIR);

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
    topPhotos.forEach(f => resizeIfNeeded(path.join(topPath, f)));

    const topId = makeId(topDir.name);

    if (subDirs.length > 0) {
      // This is a parent menu (like "projects")
      const groupName = formatLabel(topDir.name).toUpperCase();
      const groupDesc = readDescription(topPath);
      if (groupDesc) groups[groupName] = groupDesc;

      if (topPhotos.length > 0) {
        sections.push({
          id: topId,
          label: formatLabel(topDir.name),
          type: 'photos',
          group: groupName,
          description: readDescription(topPath),
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
        subPhotos.forEach(f => resizeIfNeeded(path.join(subPath, f)));

        sections.push({
          id: `${topId}-${makeId(subDir.name)}`,
          label: formatLabel(subDir.name),
          type: 'photos',
          group: groupName,
          description: readDescription(subPath),
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
        description: readDescription(topPath),
        photos: topPhotos.map(f => ({
          url: `photos/${topDir.name}/${f}`,
          caption: cleanCaption(f)
        }))
      });
    }
  }

  const manifest = {
    sections,
    groups,
    generated: new Date().toISOString()
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2));
  
  const totalPhotos = sections.reduce((sum, s) => sum + s.photos.length, 0);
  console.log(`✓ manifest.json generated`);
  console.log(`  ${sections.length} sections, ${totalPhotos} photos`);
}

scanDirectory();
