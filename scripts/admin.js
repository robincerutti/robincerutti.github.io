#!/usr/bin/env node
/**
 * admin.js — Interface admin pour réordonner et gérer les photos
 * Usage: node scripts/admin.js [dossier]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, execFileSync, spawnSync } = require('child_process');

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const PORT = 3001;
const ROOT = path.join(__dirname, '..');
const PHOTOS_DIR = path.join(ROOT, 'photos');

function isImage(f) {
  return EXTENSIONS.has(path.extname(f).toLowerCase());
}

function getPhotos(absFolder) {
  return fs.readdirSync(absFolder).filter(f => {
    const full = path.join(absFolder, f);
    return fs.statSync(full).isFile() && isImage(f);
  }).sort();
}

function stripPrefix(name) {
  return name.replace(/^\d{1,3}[-_]/, '');
}

function getFolders(dir, rel) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const images = entries.filter(e => e.isFile() && isImage(e.name));
  if (images.length > 0) result.push({ path: rel, count: images.length });
  for (const e of entries.filter(e => e.isDirectory())) {
    result.push(...getFolders(path.join(dir, e.name), rel + '/' + e.name));
  }
  return result;
}

function applyOrder(absFolder, orderedNames) {
  for (const f of orderedNames) {
    fs.renameSync(path.join(absFolder, f), path.join(absFolder, '__tmp__' + f));
  }
  orderedNames.forEach((name, i) => {
    const prefix = String(i + 1).padStart(2, '0') + '_';
    const base = stripPrefix(name);
    fs.renameSync(path.join(absFolder, '__tmp__' + name), path.join(absFolder, prefix + base));
  });
  return getPhotos(absFolder);
}

function moveToTrash(filepath) {
  execFileSync('osascript', ['-e', `tell application "Finder" to delete POSIX file "${filepath}"`]);
}

// Génère une miniature base64 via sips (natif macOS)
function thumbBase64(filepath) {
  try {
    const tmp = '/tmp/rc_admin_thumb.jpg';
    spawnSync('sips', ['-Z', '220', '-s', 'format', 'jpeg', filepath, '--out', tmp], { stdio: 'ignore' });
    if (!fs.existsSync(tmp)) return '';
    const data = fs.readFileSync(tmp).toString('base64');
    fs.unlinkSync(tmp);
    return 'data:image/jpeg;base64,' + data;
  } catch (e) { return ''; }
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Pages HTML ───────────────────────────────────────────

function pagePicker() {
  const folders = getFolders(PHOTOS_DIR, 'photos');
  const rows = folders.map(f =>
    `<a class="folder" href="/?f=${encodeURIComponent(f.path)}">
      <span>${esc(f.path)}</span><span class="count">${f.count} photos</span>
    </a>`
  ).join('');
  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><title>Admin</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: monospace; font-size: 12px; background: #111; color: #ccc; padding: 30px; }
h1 { font-size: 13px; color: #fff; margin-bottom: 6px; }
.sub { color: #555; font-size: 11px; margin-bottom: 24px; }
.folder { display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; margin-bottom: 4px; background: #1a1a1a;
  text-decoration: none; color: #ccc; border: 1px solid transparent; }
.folder:hover { background: #222; border-color: #444; color: #fff; }
.count { color: #555; font-size: 10px; }
</style></head><body>
<h1>ADMIN — CHOISIR UN DOSSIER</h1>
<div class="sub">Cliquer pour organiser</div>
${rows}
</body></html>`;
}

function pageAdmin(folderRel, absFolder) {
  const photos = getPhotos(absFolder);
  console.log(`  Génération miniatures pour ${photos.length} photos...`);

  // Génère les miniatures en base64
  const thumbs = photos.map((name, i) => {
    process.stdout.write(`\r  ${i + 1}/${photos.length} : ${name.slice(0, 40)}`);
    const b64 = thumbBase64(path.join(absFolder, name));
    return { name, b64 };
  });
  process.stdout.write('\n');

  const thumbsJson = JSON.stringify(thumbs);

  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><title>Admin — ${esc(folderRel)}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: monospace; font-size: 12px; background: #111; color: #ccc; padding: 20px; }
.topbar { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.back { color: #555; text-decoration: none; font-size: 11px; }
.back:hover { color: #aaa; }
h1 { font-size: 13px; color: #fff; flex: 1; }
#grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin-bottom: 20px; }
.thumb { position: relative; aspect-ratio: 1; overflow: hidden; cursor: grab;
  border: 2px solid transparent; background: #222; }
.thumb:active { cursor: grabbing; }
.thumb.dragging { opacity: .3; }
.thumb.over { border-color: #fff; }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
.num { position: absolute; top: 5px; left: 5px; background: rgba(0,0,0,.75);
  color: #fff; font-size: 10px; padding: 2px 5px; pointer-events: none; }
.name { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,.65);
  color: #aaa; font-size: 9px; padding: 3px 5px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
.del { position: absolute; top: 5px; right: 5px; background: rgba(200,0,0,.85);
  color: #fff; border: none; width: 20px; height: 20px; cursor: pointer;
  font-size: 12px; line-height: 20px; text-align: center; opacity: 0; }
.thumb:hover .del { opacity: 1; }
#bar { display: flex; gap: 10px; align-items: center; }
button { font-family: monospace; font-size: 11px; padding: 8px 18px;
  border: none; cursor: pointer; letter-spacing: .08em; text-transform: uppercase; }
#btn-save { background: #fff; color: #000; }
#btn-save:hover { background: #ddd; }
#btn-reset { background: #2a2a2a; color: #888; }
#btn-reset:hover { background: #333; }
#btn-quit { background: #2a2a2a; color: #555; margin-left: auto; }
#btn-quit:hover { color: #aaa; }
#status { font-size: 11px; }
.ok { color: #4caf50; } .err { color: #f44; }
</style></head><body>
<div class="topbar">
  <a class="back" href="/">&#8592; Dossiers</a>
  <h1>${esc(folderRel)}</h1>
</div>
<div id="grid"></div>
<div id="bar">
  <button id="btn-save">Sauvegarder</button>
  <button id="btn-reset">Annuler</button>
  <span id="status"></span>
  <button id="btn-quit">Quitter</button>
</div>
<script>
var FOLDER = ${JSON.stringify(folderRel)};
var THUMBS = ${thumbsJson};
var order = THUMBS.map(function(t) { return t.name; });
var original = order.slice();
var dragSrc = null;

function byName(name) {
  for (var i = 0; i < THUMBS.length; i++) if (THUMBS[i].name === name) return THUMBS[i];
  return null;
}

function setStatus(msg, cls) {
  var s = document.getElementById('status');
  s.textContent = msg; s.className = cls || '';
}

function render() {
  var grid = document.getElementById('grid');
  grid.innerHTML = '';
  order.forEach(function(name, i) {
    var t = byName(name);
    var div = document.createElement('div');
    div.className = 'thumb';
    div.draggable = true;

    var img = document.createElement('img');
    img.src = t ? t.b64 : '';
    img.alt = name;

    var num = document.createElement('div');
    num.className = 'num';
    num.textContent = i + 1;

    var lbl = document.createElement('div');
    lbl.className = 'name';
    lbl.textContent = name;

    var del = document.createElement('button');
    del.className = 'del';
    del.textContent = 'x';
    del.onclick = function(e) {
      e.stopPropagation();
      if (!confirm('Envoyer a la corbeille :\n' + name + ' ?')) return;
      fetch('/delete', { method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ folder: FOLDER, name: name })
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.ok) {
          order = order.filter(function(n) { return n !== name; });
          original = original.filter(function(n) { return n !== name; });
          THUMBS = THUMBS.filter(function(t) { return t.name !== name; });
          render(); setStatus('Corbeille OK', 'ok');
        } else { setStatus(d.error, 'err'); }
      });
    };

    div.appendChild(img);
    div.appendChild(num);
    div.appendChild(lbl);
    div.appendChild(del);

    div.addEventListener('dragstart', function(e) {
      dragSrc = name;
      setTimeout(function() { div.classList.add('dragging'); }, 0);
      e.dataTransfer.effectAllowed = 'move';
    });
    div.addEventListener('dragend', function() { div.classList.remove('dragging'); });
    div.addEventListener('dragover', function(e) { e.preventDefault(); div.classList.add('over'); });
    div.addEventListener('dragleave', function() { div.classList.remove('over'); });
    div.addEventListener('drop', function(e) {
      e.preventDefault(); div.classList.remove('over');
      if (dragSrc === name) return;
      var from = order.indexOf(dragSrc), to = order.indexOf(name);
      order.splice(from, 1); order.splice(to, 0, dragSrc);
      render();
    });

    grid.appendChild(div);
  });
}

document.getElementById('btn-save').addEventListener('click', function() {
  setStatus('Sauvegarde...', '');
  fetch('/save', { method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ folder: FOLDER, order: order })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ok) { original = order.slice(); setStatus('Sauvegarde OK', 'ok'); }
    else { setStatus(d.error, 'err'); }
  });
});

document.getElementById('btn-reset').addEventListener('click', function() {
  order = original.slice(); render(); setStatus('');
});

document.getElementById('btn-quit').addEventListener('click', function() {
  fetch('/quit', { method: 'POST' }).then(function() {
    document.body.innerHTML = '<p style="padding:40px;font-family:monospace;color:#555">Serveur arrete.</p>';
  });
});

render();
</script>
</body></html>`;
}

// ─── Serveur ──────────────────────────────────────────────

const server = http.createServer(function(req, res) {
  const url = new URL(req.url, 'http://localhost:' + PORT);

  function readBody(cb) {
    let body = '';
    req.on('data', function(d) { body += d; });
    req.on('end', function() {
      try { cb(JSON.parse(body)); }
      catch(e) { res.writeHead(400); res.end('Bad JSON'); }
    });
  }

  function json(data) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(data));
  }

  if (req.method === 'POST' && url.pathname === '/save') {
    readBody(function(body) {
      try {
        const abs = path.resolve(ROOT, body.folder);
        if (!abs.startsWith(ROOT)) throw new Error('Chemin invalide');
        applyOrder(abs, body.order);
        json({ ok: true });
      } catch(e) { json({ ok: false, error: e.message }); }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/delete') {
    readBody(function(body) {
      try {
        const abs = path.resolve(ROOT, body.folder);
        const fp = path.join(abs, body.name);
        if (!fp.startsWith(ROOT)) throw new Error('Chemin invalide');
        moveToTrash(fp);
        json({ ok: true });
      } catch(e) { json({ ok: false, error: e.message }); }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/quit') {
    res.writeHead(200); res.end();
    console.log('\n✓ Admin arrete.');
    setTimeout(function() { process.exit(0); }, 200);
    return;
  }

  if (req.method === 'GET') {
    const f = url.searchParams.get('f');
    if (f) {
      const abs = path.resolve(ROOT, f);
      if (!abs.startsWith(ROOT) || !fs.existsSync(abs)) {
        res.writeHead(404); res.end('Dossier introuvable'); return;
      }
      console.log(`\n  Ouverture : ${f}`);
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
      res.end(pageAdmin(f, abs));
    } else {
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
      res.end(pagePicker());
    }
    return;
  }

  res.writeHead(404); res.end();
});

const folderArg = process.argv[2];
const startUrl = folderArg
  ? 'http://localhost:' + PORT + '/?f=' + encodeURIComponent(folderArg)
  : 'http://localhost:' + PORT + '/';

server.listen(PORT, function() {
  console.log('✓ Admin sur ' + startUrl);
  console.log('  Generation des miniatures en cours...');
  try { execSync('open "' + startUrl + '"'); } catch(e) {}
});
