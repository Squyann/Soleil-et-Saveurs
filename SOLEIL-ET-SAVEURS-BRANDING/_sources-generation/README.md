# Sources de génération du kit final

Ces scripts reproduisent tous les fichiers des dossiers 01 à 08.

Ils réutilisent :
- le moteur, les maquettes et le téléchargement des polices de `00-EXPLORATION/v3/sources` ;
- les éléments du paysage de `00-EXPLORATION/v4-piste-B/sources`.

| Script | Rôle |
|---|---|
| `logo.js` | Dessin du logo validé : paysage relief, à plat, monochrome, simplifié ; emblème |
| `mono_paths.py` | Réserves monochromes en vrai vectoriel (opérations booléennes Skia) → `mono-paths.json` |
| `build.js` | SVG maîtres (texte vectorisé avec HarfBuzz et fontTools) et versions à texte éditable |
| `export.js` | PNG 1x, 2x, 4x ; PDF vectoriels ; favicons |
| `couleurs.py` | CMJN indicatifs (LittleCMS, profil Ghostscript) et contrastes WCAG |
| `charte.js` | Charte graphique PDF et mises en situation |

## Disposition attendue

Les chemins relatifs supposent les dossiers côte à côte :
- `final/` : ce dossier ;
- `b2/` : depuis `v4-piste-B/sources` ;
- `concepts/`, `mockups.js`, `deck-data.js` et `text2path.py` : depuis `v3/sources` ;
- `fonts/` et `work/`.

Ensuite :

```bash
node final/build.js <racine> <sortie-01> <sortie-06>
node final/export.js <racine> <SOLEIL-ET-SAVEURS-BRANDING>
node final/charte.js <racine> <SOLEIL-ET-SAVEURS-BRANDING>
```

## Commandes complémentaires

```bash
# favicon .ico (ImageMagick)
convert favicon-16x16.png favicon-32x32.png favicon-48x48.png favicon.ico
# EPS vectoriels depuis les PDF (poppler)
pdftops -eps fichier.pdf fichier.eps
```

## Dépendances

- Node 22 et Playwright (Chromium).
- Python 3 avec `fonttools`, `brotli`, `uharfbuzz`, `skia-python` et `Pillow`.
- ImageMagick, poppler-utils et Ghostscript (qui fournit le profil `default_cmyk.icc`).
