# robincerutti.github.io

Site portfolio de Robin Cerutti — photographe et artiste visuel.

## Déploiement

- `bash push-dev.sh` → sauvegarde sur branche `dev` (pas en ligne)
- `bash push-main.sh` → déploie sur **GitHub Pages** (branche `main`) → site en ligne

**Netlify a été abandonné** (quota de bande passante dépassé à cause des photos).

## Structure

- `data.json` — contenu texte : bio, liens, sections extras (info, contact, links)
- `manifest.json` — généré automatiquement par `node scripts/build-manifest.js`
- `photos/` — dossiers de photos, structure :
  - `photos/01-portraits/` → section top-level sans groupe
  - `photos/02-projects/mirror/` → groupe PROJECTS > sous-section mirror
  - `photos/03-commissioned/mural-abenakis/` → groupe COMMISSIONED > sous-section
- `index.html` — SPA, lit manifest.json + data.json

## Ajouter des photos

1. Déposer les images dans le bon sous-dossier de `photos/`
2. Nommer avec préfixe `01-` pour contrôler l'ordre
3. `--` dans le nom = caption (ex: `01-mirror-2011--caption ici.jpg`)
4. Lancer `bash push-main.sh`

## data.json — sections clés

- `infoText` : bio HTML affichée dans la section INFO
- `links` : liens Social et Press avec `name` + `url`
- `extraSections` : sections fixes (info, contact, links)
