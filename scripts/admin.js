#!/usr/bin/env node
/**
 * admin.js — Réordonne les photos via drag & drop
 * Usage: node scripts/admin.js [dossier]
 *   Sans argument → sélecteur de dossiers
 *   Avec argument → ouvre directement ce dossier
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const PORT = 3001;
const ROOT = path.join(__dirname, '..');
const PHOTOS_DIR = path.join(ROOT, 'photos');

// ─── Utilitaires ──────────────────────────────────────────

function isImage(f) {
  return EXTENSIONS.has(path.extname(f).toLowerCase());
}

function getPhotos(absFolder) {
  return fs.readdirSync(absFolder).filter(f =>
    fs.statSync(path.join(absFolder, f)).isFile() && isImage(f)
  ).sort();
}

function stripPrefix(name) {
  // Retire tous les préfixes numériques courts (1-3 chiffres) chainés
  // Ex: 01_02_name.jpg → name.jpg, mais 20110617_name.jpg → inchangé
  return name.replace(/^(\d{1,3}[-_])+/, '');
}

function applyOrder(absFolder, orderedNames) {
  // Renommer en tmp pour éviter les collisions
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

// Extrait le titre éditable : ce qui est entre le premier - et --
// Ex: 01_colette france-colette--2007.jpg → "colette"
//     01_portrait-jane--id.jpg            → "jane"
//     01_img.jpg (pas de - ni --)         → ""
function extractTitle(name) {
  const ext = path.extname(name);
  const base = name.slice(0, -ext.length).replace(/^(\d{1,3}[-_])+/, '');
  const dashIdx = base.indexOf('-');
  if (dashIdx === -1) return '';
  const part = base.slice(dashIdx + 1);
  return part.includes('--') ? part.split('--')[0] : part;
}

// Reconstruit le nom avec un nouveau titre entre - et --
// Si pas de - dans le nom, ajoute -titre-- à la fin du nom de base
function rebuildName(name, newTitle) {
  const ext = path.extname(name);
  const base = name.slice(0, -ext.length);
  const prefixMatch = base.match(/^(\d{1,3}[-_])+/);
  const prefix = prefixMatch ? prefixMatch[0] : '';
  const rest = base.slice(prefix.length);
  const dashIdx = rest.indexOf('-');
  if (dashIdx === -1) {
    // Pas de tiret : ajoute -titre-- après le nom de base
    return prefix + rest + '-' + newTitle + '--' + ext;
  }
  const beforeDash = rest.slice(0, dashIdx);
  const afterTitle = rest.slice(dashIdx + 1);
  const meta = afterTitle.includes('--') ? afterTitle.split('--').slice(1).join('--') : '';
  return prefix + beforeDash + '-' + newTitle + '--' + meta + ext;
}

function moveToTrash(absFolder, name) {
  const fp = path.join(absFolder, name);
  execFileSync('osascript', ['-e', `tell application "Finder" to delete POSIX file "${fp}"`]);
}

// Scan récursif des dossiers contenant des images
function getFolders(dir, rel) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const imgs = entries.filter(e => e.isFile() && isImage(e.name));
  if (imgs.length > 0) result.push({ rel, count: imgs.length });
  for (const e of entries.filter(e => e.isDirectory())) {
    result.push(...getFolders(path.join(dir, e.name), rel + '/' + e.name));
  }
  return result;
}

// ─── Pages HTML ───────────────────────────────────────────

function pagePicker() {
  const folders = getFolders(PHOTOS_DIR, 'photos');
  const rows = folders.map(f =>
    `<a class="row" href="/?f=${f.rel}">
      <span>${f.rel}</span><span class="n">${f.count} photos</span>
    </a>`
  ).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:monospace;font-size:12px;background:#111;color:#ccc;padding:30px}
h1{font-size:13px;color:#fff;margin-bottom:6px}
.sub{color:#555;font-size:11px;margin-bottom:20px}
.row{display:flex;justify-content:space-between;padding:10px 14px;margin-bottom:3px;
  background:#1a1a1a;text-decoration:none;color:#ccc;border:1px solid transparent}
.row:hover{background:#222;border-color:#444;color:#fff}
.n{color:#555;font-size:10px}
</style></head><body>
<h1>ADMIN — CHOISIR UN DOSSIER</h1>
<div class="sub">Cliquer pour organiser</div>
${rows}
</body></html>`;
}

function pageAdmin(folderRel, absFolder) {
  const photos = getPhotos(absFolder);
  const label = folderRel;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admin — ${label}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:monospace;font-size:12px;background:#111;color:#ccc;padding:20px}
.top{display:flex;align-items:center;gap:16px;margin-bottom:20px}
.back{color:#555;text-decoration:none;font-size:11px}
.back:hover{color:#aaa}
h1{font-size:13px;color:#fff;flex:1}
#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:20px}
.item{position:relative;background:#222;border:2px solid #333;cursor:grab;user-select:none}
.item img{width:100%;display:block;aspect-ratio:1;object-fit:cover;pointer-events:none}
.item .num{position:absolute;top:4px;left:4px;background:rgba(0,0,0,.8);color:#fff;font-size:10px;padding:2px 4px}
.item .lbl{font-size:9px;color:#888;padding:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item .del{position:absolute;top:4px;right:4px;background:rgba(180,0,0,.9);color:#fff;border:none;
  width:18px;height:18px;cursor:pointer;font-size:11px;line-height:18px;text-align:center;display:none}
.item:hover .del{display:block}
.item .title-input{width:100%;font-family:monospace;font-size:9px;background:#1a1a1a;color:#aaa;
  border:none;border-top:1px solid #2a2a2a;padding:3px 4px;outline:none;display:block}
.item .title-input:focus{background:#222;color:#fff;border-top-color:#555}
.item.over{border-color:#fff}
.item.dragging{opacity:.3}
#bar{display:flex;gap:10px;align-items:center}
button{font-family:monospace;font-size:11px;padding:8px 18px;border:none;cursor:pointer;
  text-transform:uppercase;letter-spacing:.05em}
#save{background:#fff;color:#000}
#save:hover{background:#ddd}
#reset{background:#333;color:#aaa}
#reset:hover{background:#3a3a3a}
#quit{background:#333;color:#666;margin-left:auto}
#quit:hover{color:#aaa}
#msg{font-size:11px}
</style></head><body>
<div class="top">
  <a class="back" href="/">&#8592; Dossiers</a>
  <h1>${label}</h1>
</div>
<div id="grid"></div>
<div id="bar">
  <button id="save">Sauvegarder</button>
  <button id="reset">Annuler</button>
  <span id="msg"></span>
  <button id="quit">Quitter</button>
</div>
<script>
var FOLDER = ${JSON.stringify(folderRel)};
var photos = ${JSON.stringify(photos)};
var order = photos.slice();
var orig = photos.slice();
var drag = null;

function photoUrl(name) {
  // Encode chaque segment du chemin séparément
  var parts = (FOLDER + '/' + name).split('/');
  return '/photo/' + parts.map(encodeURIComponent).join('/');
}

function extractTitle(name) {
  var dotIdx = name.lastIndexOf('.');
  var base = dotIdx !== -1 ? name.slice(0, dotIdx) : name;
  base = base.replace(/^(\\d{1,3}[-_])+/, '');
  var dashIdx = base.indexOf('-');
  if (dashIdx === -1) return '';
  var part = base.slice(dashIdx + 1);
  return part.indexOf('--') !== -1 ? part.split('--')[0] : part;
}

function msg(txt, col) {
  var el = document.getElementById('msg');
  el.textContent = txt;
  el.style.color = col || '#555';
}

function render() {
  var g = document.getElementById('grid');
  g.innerHTML = '';
  order.forEach(function(name, i) {
    var d = document.createElement('div');
    d.className = 'item';
    d.draggable = true;

    var img = document.createElement('img');
    img.src = photoUrl(name);

    var num = document.createElement('div');
    num.className = 'num';
    num.textContent = i + 1;

    var lbl = document.createElement('div');
    lbl.className = 'lbl';
    lbl.textContent = name;

    var del = document.createElement('button');
    del.className = 'del';
    del.textContent = 'x';
    del.onclick = function(e) {
      e.stopPropagation();
      if (!confirm('Corbeille : ' + name + ' ?')) return;
      fetch('/delete', {method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({folder: FOLDER, name: name})
      }).then(function(r){return r.json();}).then(function(j){
        if (j.ok) {
          order = order.filter(function(n){return n !== name;});
          orig = orig.filter(function(n){return n !== name;});
          render(); msg('Corbeille OK', '#4caf50');
        } else { msg(j.error, '#f44'); }
      });
    };

    var titleInput = document.createElement('input');
    titleInput.className = 'title-input';
    titleInput.type = 'text';
    titleInput.placeholder = 'titre…';
    titleInput.value = extractTitle(name);
    titleInput.addEventListener('mousedown', function(e) { e.stopPropagation(); });
    titleInput.addEventListener('dragstart', function(e) { e.stopPropagation(); e.preventDefault(); });
    (function(currentName) {
      function doRename() {
        var newTitle = titleInput.value.trim();
        if (newTitle === extractTitle(currentName)) return;
        fetch('/rename', {method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({folder: FOLDER, oldName: currentName, newTitle: newTitle})
        }).then(function(r){return r.json();}).then(function(j){
          if (j.ok) {
            var idx = order.indexOf(currentName);
            if (idx !== -1) order[idx] = j.newName;
            var oidx = orig.indexOf(currentName);
            if (oidx !== -1) orig[oidx] = j.newName;
            msg('Renommé', '#4caf50');
            render();
          } else { msg(j.error, '#f44'); }
        });
      }
      titleInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { titleInput.blur(); } });
      titleInput.addEventListener('blur', doRename);
    })(name);

    d.appendChild(img);
    d.appendChild(num);
    d.appendChild(lbl);
    d.appendChild(titleInput);
    d.appendChild(del);

    d.addEventListener('dragstart', function(e) {
      drag = name;
      setTimeout(function(){d.classList.add('dragging');}, 0);
      e.dataTransfer.effectAllowed = 'move';
    });
    d.addEventListener('dragend', function() { d.classList.remove('dragging'); });
    d.addEventListener('dragover', function(e) { e.preventDefault(); d.classList.add('over'); });
    d.addEventListener('dragleave', function() { d.classList.remove('over'); });
    d.addEventListener('drop', function(e) {
      e.preventDefault(); d.classList.remove('over');
      if (drag === name) return;
      var f = order.indexOf(drag), t = order.indexOf(name);
      order.splice(f, 1); order.splice(t, 0, drag);
      render();
    });

    g.appendChild(d);
  });
}

document.getElementById('save').onclick = function() {
  msg('Sauvegarde...');
  fetch('/save', {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({folder: FOLDER, order: order})
  }).then(function(r){return r.json();}).then(function(j){
    if (j.ok) { order = j.files.slice(); orig = j.files.slice(); render(); msg('OK', '#4caf50'); }
    else { msg(j.error, '#f44'); }
  });
};

document.getElementById('reset').onclick = function() {
  order = orig.slice(); render(); msg('');
};

document.getElementById('quit').onclick = function() {
  fetch('/quit', {method:'POST'}).then(function() {
    document.body.innerHTML = '<p style="padding:40px;font-family:monospace;color:#555">Arrete.</p>';
  });
};

render();
</script>
</body></html>`;
}

// ─── Serveur ──────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:' + PORT);

  // Photos : /photo/photos/dossier/nom-de-fichier.jpg
  // Le nom de fichier peut contenir des espaces encodés en %20
  if (req.method === 'GET' && urlObj.pathname.startsWith('/photo/')) {
    // Ex: /photo/photos/hidden/marseille/01-photo%20name.jpg
    const rawPath = urlObj.pathname.slice(7); // 'photos/hidden/marseille/01-photo%20name.jpg'
    const lastSlash = rawPath.lastIndexOf('/');
    const folderPart = decodeURIComponent(rawPath.slice(0, lastSlash));
    const namePart = decodeURIComponent(rawPath.slice(lastSlash + 1));
    const fp = path.join(ROOT, folderPart, namePart);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) {
      res.writeHead(404); res.end(); return;
    }
    const ext = path.extname(fp).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(fp).pipe(res);
    return;
  }

  function readBody(cb) {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => { try { cb(JSON.parse(body)); } catch(e) { res.writeHead(400); res.end(); } });
  }

  function json(data) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  if (req.method === 'POST' && urlObj.pathname === '/save') {
    readBody(({ folder, order }) => {
      try {
        const abs = path.resolve(ROOT, folder);
        if (!abs.startsWith(ROOT)) throw new Error('Chemin invalide');
        const newFiles = applyOrder(abs, order);
        json({ ok: true, files: newFiles });
      } catch(e) { json({ ok: false, error: e.message }); }
    });
    return;
  }

  if (req.method === 'POST' && urlObj.pathname === '/rename') {
    readBody(({ folder, oldName, newTitle }) => {
      try {
        const abs = path.resolve(ROOT, folder);
        if (!abs.startsWith(ROOT)) throw new Error('Chemin invalide');
        const newName = rebuildName(oldName, newTitle);
        if (newName !== oldName) {
          fs.renameSync(path.join(abs, oldName), path.join(abs, newName));
        }
        json({ ok: true, newName });
      } catch(e) { json({ ok: false, error: e.message }); }
    });
    return;
  }

  if (req.method === 'POST' && urlObj.pathname === '/delete') {
    readBody(({ folder, name }) => {
      try {
        const abs = path.resolve(ROOT, folder);
        if (!abs.startsWith(ROOT)) throw new Error('Chemin invalide');
        moveToTrash(abs, name);
        json({ ok: true });
      } catch(e) { json({ ok: false, error: e.message }); }
    });
    return;
  }

  if (req.method === 'POST' && urlObj.pathname === '/quit') {
    res.writeHead(200); res.end();
    console.log('Arrete.');
    setTimeout(() => process.exit(0), 200);
    return;
  }

  if (req.method === 'GET') {
    // Dossier passé en query string non encodé : /?f=photos/01-portraits
    const f = urlObj.searchParams.get('f');
    if (f) {
      const abs = path.resolve(ROOT, f);
      if (!abs.startsWith(ROOT) || !fs.existsSync(abs)) {
        res.writeHead(404); res.end('Dossier introuvable'); return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(pageAdmin(f, abs));
      return;
    }
    // Pas de dossier → sélecteur
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(pagePicker());
    return;
  }

  res.writeHead(404); res.end();
});

// Dossier en argument → ouvre directement
const folderArg = process.argv[2];
const startUrl = folderArg
  ? 'http://localhost:' + PORT + '/?f=' + folderArg
  : 'http://localhost:' + PORT + '/';

server.listen(PORT, () => {
  console.log('Admin : ' + startUrl);
  console.log('Ctrl+C ou bouton Quitter pour arreter');
  try { execSync('open "' + startUrl + '"'); } catch(e) {}
});
