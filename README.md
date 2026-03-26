# robincerutti.github.io

Portfolio de Robin Cerutti — site auto-généré à partir de dossiers de photos.

## Comment ça marche

```
photos/
├── portraits/          → menu "PORTRAITS"
│   ├── 01-photo.jpg
│   ├── 02-autre.jpg
├── projects/           → menu parent "PROJECTS" (dépliable)
│   ├── mirror/         →   sous-menu "mirror"
│   │   ├── 01-photo.jpg
│   │   ├── 02-photo.jpg
│   ├── lookup/         →   sous-menu "lookup"
│   ├── introspection/  →   sous-menu "introspection"
│   └── ...
├── commissioned/       → menu "COMMISSIONED"
```

**La structure des dossiers = la structure du site.**

- Dossier dans `photos/` avec des images dedans → menu principal
- Dossier dans `photos/` avec des sous-dossiers → menu parent dépliable
- Les images sont triées par nom de fichier (préfixer avec `01-`, `02-` pour contrôler l'ordre)
- Le nom du fichier (sans le préfixe numérique) devient la légende

## Ajouter des photos

1. Glisse tes photos dans le bon dossier
2. `git add .`
3. `git commit -m "ajout photos mirror"`
4. `git push`

Le GitHub Action scanne automatiquement les dossiers et met à jour le site.

## Créer une nouvelle section

Crée simplement un nouveau dossier dans `photos/` et mets-y des images.

Nouveau menu principal :
```
photos/nouvelle-section/
  ├── 01-photo.jpg
```

Nouveau sous-menu dans un menu parent existant :
```
photos/projects/nouveau-projet/
  ├── 01-photo.jpg
```

Nouveau menu parent avec sous-menus :
```
photos/editorial/
  ├── serie-1/
  │   ├── 01-photo.jpg
  ├── serie-2/
  │   ├── 01-photo.jpg
```

## Modifier les textes et liens

Édite `data.json` directement sur GitHub ou en local :

- `name` — nom affiché dans le sidebar
- `email` — email de contact
- `infoText` — texte de la page Info (HTML autorisé)
- `links` — liens externes (Instagram, presse, etc.)

## Ordre des menus

Les dossiers sont triés alphabétiquement. Pour contrôler l'ordre, préfixe les dossiers :

```
photos/
├── 01-portraits/
├── 02-projects/
│   ├── 01-mirror/
│   ├── 02-lookup/
├── 03-commissioned/
```

Le préfixe numérique sera retiré du nom affiché.

## Setup initial

1. Crée un repo GitHub nommé `tonnom.github.io`
2. Copie tous ces fichiers dedans
3. Va dans Settings → Pages → Source: "Deploy from a branch" → branch `main`
4. Pousse des photos dans les dossiers
5. Le site sera en ligne sur `https://tonnom.github.io`

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Le site (ne pas toucher sauf pour modifier le design) |
| `data.json` | Config éditable (nom, textes, liens) |
| `manifest.json` | Auto-généré — liste des photos (ne pas éditer à la main) |
| `scripts/build-manifest.js` | Script qui scanne les dossiers |
| `.github/workflows/build-manifest.yml` | GitHub Action qui lance le script à chaque push |
| `photos/` | Tes photos, organisées en dossiers |
