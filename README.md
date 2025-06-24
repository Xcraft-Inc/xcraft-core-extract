# 📘 xcraft-core-extract

## Aperçu

Le module `xcraft-core-extract` est une librairie utilitaire du framework Xcraft qui fournit des fonctions d'extraction pour différents formats d'archives compressées. Il offre une interface unifiée pour extraire des fichiers TAR, ZIP, 7-Zip et leurs variantes compressées (gzip, bzip2, xz), avec support du suivi de progression en temps réel.

## Sommaire

- [Structure du module](#structure-du-module)
- [Fonctionnement global](#fonctionnement-global)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Interactions avec d'autres modules](#interactions-avec-dautres-modules)
- [Détails des sources](#détails-des-sources)

## Structure du module

Le module expose une collection de fonctions d'extraction spécialisées :

- **Formats TAR** : `targz`, `tarbz2`, `tarxz` avec leurs alias `tgz`, `gz`, `bz2`, `xz`
- **Format ZIP** : `zip`
- **Format 7-Zip** : `7z` (Windows uniquement)

Chaque fonction suit une signature similaire et utilise des streams Node.js pour optimiser les performances et permettre le suivi de progression.

## Fonctionnement global

Le module utilise une architecture basée sur les streams Node.js pour traiter efficacement les archives volumineuses :

1. **Lecture du fichier source** via `fs.createReadStream()`
2. **Suivi de progression** avec deux streams de progression (avant et après décompression)
3. **Décompression** selon le format (zlib, bzip2, xz)
4. **Extraction** vers le répertoire de destination
5. **Gestion d'erreurs** et callbacks de fin de traitement

Le système de progression utilise un mécanisme de throttling (250ms) pour éviter la surcharge des callbacks de progression et calculer dynamiquement la taille totale après décompression.

## Exemples d'utilisation

### Extraction d'une archive TAR.GZ avec progression

```javascript
const extract = require('xcraft-core-extract');

// Extraction avec suivi de progression
extract.targz(
  '/path/to/archive.tar.gz',
  '/path/to/destination',
  null, // pas de filtre
  resp, // objet response Xcraft
  (err) => {
    if (err) {
      console.error("Erreur d'extraction:", err);
    } else {
      console.log('Extraction terminée');
    }
  },
  (transferred, total) => {
    const percent = ((transferred / total) * 100).toFixed(2);
    console.log(`Progression: ${percent}%`);
  }
);
```

### Extraction d'un fichier ZIP

```javascript
extract.zip(
  '/path/to/archive.zip',
  '/path/to/destination',
  null,
  resp,
  (err) => {
    if (err) {
      console.error("Erreur d'extraction ZIP:", err);
    } else {
      console.log('Archive ZIP extraite avec succès');
    }
  }
);
```

### Extraction avec filtrage de fichiers

```javascript
// Exclure les fichiers .tmp lors de l'extraction
const filter = /\.tmp$/;

extract.tarbz2(
  '/path/to/archive.tar.bz2',
  '/path/to/destination',
  filter, // exclut les fichiers correspondant au pattern
  resp,
  (err) => {
    if (err) {
      console.error('Erreur:', err);
    } else {
      console.log('Extraction filtrée terminée');
    }
  }
);
```

### Extraction d'archive 7-Zip (Windows)

```javascript
extract['7z'](
  '/path/to/archive.7z',
  '/path/to/destination',
  null,
  resp,
  (err) => {
    if (err) {
      console.error('Erreur extraction 7z:', err);
    } else {
      console.log('Archive 7z extraite');
    }
  }
);
```

## Interactions avec d'autres modules

Le module `xcraft-core-extract` interagit avec plusieurs modules de l'écosystème Xcraft :

- **[xcraft-core-process]** : Utilisé pour l'extraction des archives 7-Zip via l'exécutable `7za.exe`
- **Système de logging Xcraft** : Utilise l'objet `resp` pour tracer les opérations d'extraction

## Détails des sources

### `index.js`

Le fichier principal expose toutes les fonctions d'extraction et contient la logique centrale du module.

#### Fonction `progressStreams(file, callback)`

Crée un système de suivi de progression sophistiqué avec deux streams :

- **Stream "before"** : Suit la lecture du fichier source compressé
- **Stream "after"** : Calcule dynamiquement la progression de l'extraction en estimant la taille totale décompressée

Le système utilise un throttling de 250ms pour optimiser les performances des callbacks de progression.

#### Fonction `untar(src, dest, filter, inflate, callback, callbackProgress)`

Fonction générique pour l'extraction des archives TAR avec différents algorithmes de compression. Elle :

- Crée le répertoire de destination de manière récursive
- Configure le pipeline de streams (lecture → progression → décompression → extraction)
- Applique les filtres d'exclusion de fichiers
- Préserve les timestamps des fichiers (`noMtime: false`)

**Paramètres :**
- **`src`** : Chemin vers l'archive source
- **`dest`** : Répertoire de destination
- **`filter`** : Expression régulière pour exclure certains fichiers
- **`inflate`** : Fonction de décompression spécifique au format
- **`callback`** : Fonction appelée à la fin de l'extraction
- **`callbackProgress`** : Fonction appelée pour le suivi de progression

#### Méthodes publiques

- **`targz(src, dest, filter, resp, callback, callbackProgress)`** — Extrait les archives TAR compressées avec gzip (.tar.gz, .tgz) en utilisant le module `zlib`
- **`tarbz2(src, dest, filter, resp, callback, callbackProgress)`** — Extrait les archives TAR compressées avec bzip2 (.tar.bz2) via `unbzip2-stream`
- **`tarxz(src, dest, filter, resp, callback, callbackProgress)`** — Extrait les archives TAR compressées avec xz (.tar.xz) via `xz-pipe`
- **`zip(src, dest, filter, resp, callback)`** — Extrait les archives ZIP en utilisant `extract-zip` (version fork Xcraft)
- **`7z(src, dest, filter, resp, callback)`** — Extrait les archives 7-Zip via l'exécutable externe `7za.exe` (Windows uniquement)

#### Alias disponibles

Le module fournit plusieurs alias pour faciliter l'utilisation :

- **`tgz`** : Alias pour `targz`
- **`gz`** : Alias pour `targz`
- **`bz2`** : Alias pour `tarbz2`
- **`xz`** : Alias pour `tarxz`

#### Gestion des erreurs

Le module propage les erreurs via les callbacks et gère spécifiquement :

- Erreurs de lecture du fichier source
- Erreurs de décompression (zlib, bzip2, xz)
- Erreurs d'écriture dans le répertoire de destination
- Erreurs de processus externe (pour 7-Zip)
- Erreurs d'extraction ZIP (via async/await)

#### Particularités techniques

- **Extraction ZIP** : Utilise une approche async/await avec `extract-zip`
- **Extraction 7-Zip** : Utilise `xcraft-core-process` pour spawner `7za.exe` avec les arguments `-x -y -o<dest> <src>`
- **Filtrage** : Appliqué uniquement aux archives TAR, inverse la logique du filtre (exclut les fichiers qui matchent)
- **Progression** : Calcul dynamique de la taille totale basé sur le ratio de compression observé

#### Limitations

- L'extraction 7-Zip n'est supportée que sur Windows et nécessite `7za.exe`
- L'extraction ZIP ne supporte pas le suivi de progression
- Le filtrage n'est pas supporté pour les archives ZIP et 7-Zip
- Les timestamps sont préservés pour les archives TAR mais pas nécessairement pour ZIP/7z

---

_Documentation mise à jour_

[xcraft-core-process]: https://github.com/Xcraft-Inc/xcraft-core-process