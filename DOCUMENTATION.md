# Documentation — robincerutti.github.io

Site portfolio de Robin Cerutti, photographe et artiste visuel.
Rédigé pour permettre de reprendre le projet depuis n'importe quel ordinateur.

---

## 1. Vue d'ensemble

Le site est une **Single Page Application (SPA)** statique :
- `index.html` — toute l'interface (HTML + CSS + JS, un seul fichier)
- `manifest.json` — liste de toutes les photos, généré automatiquement
- `data.json` — contenu texte : bio, liens, sections extras
- `photos/` — les images organisées en dossiers

Il n'y a pas de base de données, pas de serveur, pas de framework. Tout est statique.

---

## 2. Hébergement

**GitHub Pages** — le site est servi directement depuis la branche `main` du dépôt GitHub.

- URL du site : https://robincerutti.github.io
- Dépôt GitHub : https://github.com/robincerutti/robincerutti.github.io
- Branche `main` → en ligne
- Branche `dev` → développement local uniquement (pas en ligne)

> Netlify a été abandonné car le quota de bande passante était dépassé à cause du volume des photos.

---

## 3. Prérequis pour travailler en local

### Logiciels nécessaires

| Outil | Usage | Installation |
|-------|-------|-------------|
| **Git** | Versionning et déploiement | Préinstallé sur macOS ou `xcode-select --install` |
| **Node.js** | Génération du manifest | https://nodejs.org (version LTS) |
| **exiftool** | Préserver les métadonnées EXIF lors du redimensionnement | `brew install exiftool` |
| **sips** | Redimensionnement des images | Préinstallé sur macOS |

> `exiftool` est indispensable. Sans lui, les données EXIF (date, appareil, etc.) sont perdues quand une image est redimensionnée.

### Cloner le dépôt sur un nouvel ordinateur

```bash
git clone https://github.com/robincerutti/robincerutti.github.io.git
cd robincerutti.github.io
git checkout dev
```

---

## 4. Structure des fichiers

```
robincerutti.github.io/
├── index.html                  ← toute l'interface du site
├── data.json                   ← bio, liens, sections extras
├── manifest.json               ← généré automatiquement, ne pas modifier à la main
├── push-dev.sh                 ← sauvegarde sur branche dev
├── push-main.sh                ← déploie en ligne sur main
├── scripts/
│   └── build-manifest.js       ← script de génération du manifest
└── photos/
    ├── 01-portraits/           ← section top-level "PORTRAITS"
    ├── 02-projects/            ← groupe "PROJECTS" avec sous-sections
    │   ├── 010-mirror/
    │   ├── 020-presence/
    │   ├── 030-parts-of-life/
    │   └── ...
    └── 03-commissioned/        ← groupe "COMMISSIONED" avec sous-sections
        └── mural-abenakis/
```

---

## 5. Organisation des photos

### Logique des dossiers → menus

| Structure | Résultat dans le menu |
|-----------|----------------------|
| `photos/01-portraits/` | Section top-level **PORTRAITS** |
| `photos/02-projects/010-mirror/` | Groupe **PROJECTS** > sous-section **mirror** |
| `photos/03-commissioned/mural-abenakis/` | Groupe **COMMISSIONED** > sous-section **mural abenakis** |

- Le préfixe numérique (`01-`, `02-`, `010-`) contrôle l'ordre d'affichage
- Il est supprimé automatiquement dans le menu
- Les tirets et underscores sont remplacés par des espaces dans les labels

### Nommage des images

```
01-nom-de-la-photo--caption visible ici.jpg
│   │                │
│   │                └── texte affiché comme légende (après --)
│   └── nom de la photo (avant --)
└── préfixe numérique pour contrôler l'ordre
```

- Le préfixe numérique (`01-`, `02-`, `01_02-`) est supprimé automatiquement
- Le `--` sépare le nom technique de la légende visible
- Sans `--` dans le nom → aucune légende affichée
- La légende affichée = tout ce qui est **avant** `--`

**Exemples :**
```
01-mirror-2011--Miroir, Paris 2011.jpg   → légende : "mirror 2011"
02-portrait.jpg                           → aucune légende
01_07- Ramatuelle 2011--.jpg              → légende : "Ramatuelle 2011"
```

### Description d'une section

Créer un fichier `_description.txt` dans le dossier pour afficher un texte sous le titre de la section.

---

## 6. Ajouter des photos — procédure

1. Déposer les images dans le bon sous-dossier de `photos/`
2. Nommer avec préfixe numérique pour contrôler l'ordre (`01-`, `02-`, etc.)
3. Ajouter `--` dans le nom si une légende est souhaitée
4. Lancer le déploiement :

```bash
bash push-main.sh
```

Le script redimensionne automatiquement les images trop grandes (max 2000px) en conservant les EXIF.

---

## 7. Modifier le contenu texte

Tout le contenu texte est dans `data.json` :

- **`infoText`** : bio HTML affichée dans la section INFO (balises HTML acceptées : `<br>`, `<strong>`, etc.)
- **`links`** : liens Social, Galleries, Shop, Press — tableau de sections avec `name` + `url`
- **`email`** : adresse email du formulaire de contact
- **`extraSections`** : sections fixes (info, contact, links) — ne pas modifier

---

## 8. Commandes de maintenance

### Déploiement

```bash
# Sauvegarder sur dev (pas en ligne)
bash push-dev.sh

# Mettre en ligne (déploie sur GitHub Pages)
bash push-main.sh
```

### Prévisualisation locale

```bash
npx serve .
# Ouvrir http://localhost:3000
```

### Régénérer le manifest sans déployer

```bash
node scripts/build-manifest.js
```

### Git — commandes utiles

```bash
git status                    # état des fichiers modifiés
git log --oneline -10         # 10 derniers commits
git checkout dev              # revenir sur dev si on est ailleurs
```

---

## 9. Libérer de l'espace disque (macOS)

Le repo pèse ~570 Mo à cause des photos. En parallèle, macOS peut consommer beaucoup d'espace avec les caches Adobe et les snapshots Time Machine.

### Vider le cache Adobe Camera Raw (~30-40 Go)

```bash
rm -rf ~/Library/Caches/"Adobe Camera Raw 2"
```

### Purger les snapshots Time Machine locaux

```bash
tmutil deletelocalsnapshots /
```

> macOS crée des snapshots locaux toutes les heures entre deux sauvegardes. Sur une machine avec beaucoup de fichiers photos/Adobe, ça peut représenter 50-80 Go en quelques jours.

---

## 10. Workflow type d'une session

1. Ajouter/déplacer des photos dans `photos/`
2. Tester en local : `npx serve .` → http://localhost:3000
3. Sauvegarder sur dev : `bash push-dev.sh`
4. Mettre en ligne : `bash push-main.sh`

Le site est visible sur https://robincerutti.github.io environ 1-2 minutes après le push.

---

## 11. En cas de problème

| Problème | Solution |
|----------|----------|
| Les EXIF sont perdus après redimensionnement | Installer exiftool : `brew install exiftool` |
| Le manifest ne se génère pas | Vérifier que Node.js est installé : `node --version` |
| Le site ne se met pas à jour | Attendre 2 min, vider le cache navigateur |
| On est sur la mauvaise branche | `git checkout dev` |
| Espace disque critique | Purger cache Adobe + snapshots TM (voir section 9) |
