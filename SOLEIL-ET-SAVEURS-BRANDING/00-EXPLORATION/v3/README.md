# Soleil et Saveurs — Exploration élargie (v3) : 15 nouvelles pistes

Statut : **exploration, en attente de choix**. Ces pistes complètent les pistes A, B et C (dossier `../v2`).

Chaque piste explore un type de logo différent.

| Piste | Nom | Type de logo | Idée |
|---|---|---|---|
| D | Le Point de soleil | Logotype pur | Le point du « i » de Soleil est un petit soleil d'or |
| E | Le Monogramme | Monogramme | S&S, esperluette d'or dans un cartouche ovale |
| F | Le Sceau du primeur | Emblème, sceau | Un bord de 30 rayons pour 30 ans de marchés (mention à valider) |
| G | L'Étiquette | Logo-étiquette | Le logo a la forme de l'étiquette collée sur les fruits |
| H | L'Horizon décalé | Marque abstraite | Soleil et terre, deux moitiés qui glissent : le mouvement de la livraison |
| I | La Tomate vue du ciel | Pictogramme | Vu d'en haut, le calice de la tomate dessine un soleil |
| J | La Feuille signée | Espace négatif | La nervure de la feuille dessine un S |
| K | Le Soleil gourmand | Personnage | Un fruit-soleil qui savoure, décliné en expressions |
| L | La Signature | Signature manuscrite | Le primeur signe sa sélection |
| M | Le Jardin modulaire | Système géométrique | Quatre tuiles qui se recombinent |
| N | Le Fruit de saison | Logo dynamique | Radis, abricot, potiron, clémentine selon la saison |
| O | D'un seul trait | Dessin au trait | Le fruit, la feuille et le soleil d'un même fil |
| P | Le Pochoir de cagette | Logotype pochoir | Le marquage des caisses de marché, en bloc |
| Q | Le Soleil des Halles | Art déco | Le soleil levant des affiches des années 1930 |
| R | Le Soleil d'or | Logo génératif | Les graines du tournesol, posées selon l'angle d'or, calculées une à une |

## Contenu

- `Soleil-et-Saveurs-exploration-15-pistes.pdf` : la présentation, 33 diapositives, vectorielle.
  - 01 : couverture.
  - 02 : panorama des 18 pistes.
  - 03 à 32 : deux planches par piste (logo, puis mises en situation).
  - 33 : comment choisir.
- `diapositives/` : les mêmes diapositives en images 3840 × 2160.
- `logos/piste-D` … `piste-R` : logos SVG, texte vectorisé. Pour chaque piste :
  - horizontal, vertical et symbole ;
  - chacun en couleur, fond sombre, noir et blanc.
- `logos/` contient aussi des variantes propres à certaines pistes :
  - N : les quatre saisons ;
  - K : les expressions du personnage ;
  - M : les combinaisons de tuiles ;
  - R : les variantes générées.
- `sources/` : scripts de génération et `telecharger-polices.sh`.

## Polices

Toutes sont publiées sous SIL Open Font License : usage commercial libre et gratuit (Google Fonts).

Bodoni Moda, Playfair Display, Marcellus, Young Serif, Outfit, DM Serif Display, DM Sans, Manrope, Hepta Slab, Corinthia, Syne, Instrument Serif, Josefin Sans, Big Shoulders Stencil Display, Limelight, Sora, Jost.

## Régénérer

```bash
cd sources && mkdir -p work && ./telecharger-polices.sh
pip install fonttools brotli uharfbuzz
node concepts/build.js "$PWD" ../logos
SCALE=2 PDF=../exploration.pdf node deck3.js "$PWD" ../logos ../../v2/logos ../diapositives
```

## Mentions

Aucune proposition n'est déclarée juridiquement disponible. Une recherche d'antériorité (INPI, EUIPO) est recommandée avant tout dépôt ou usage commercial.

Les mises en situation sont des illustrations vectorielles, pas des photographies.
