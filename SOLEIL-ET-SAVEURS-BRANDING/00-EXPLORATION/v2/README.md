# Soleil et Saveurs — Propositions perfectionnées (v2)

Statut : **trois pistes perfectionnées, en attente du choix**. Le kit complet (dossiers `01` à `08`) sera produit pour la piste retenue.

## Contenu

| Élément | Description |
|---|---|
| `Soleil-et-Saveurs-propositions-v2.pdf` | Présentation complète, 40 diapositives 16:9, vectorielle |
| `diapositives/01.png` … `40.png` | Les mêmes diapositives en images 3840 × 2160 |
| `logos/piste-A`, `piste-B`, `piste-C` | Logos maîtres SVG : horizontal, vertical, symbole × couleur, fond sombre, noir, blanc |
| `sources/` | Scripts qui génèrent les logos et la présentation |

### Plan de la présentation

| Diapositives | Contenu |
|---|---|
| 01–02 | Couverture, point de départ (audit du logo actuel) |
| 03–14 | Piste A « L'Étoile du fruit » |
| 15–26 | Piste B « L'Horizon gourmand » |
| 27–38 | Piste C « Le Sommet de l'étal » |
| 39–40 | Comparatif, prochaines étapes |

Chaque piste suit le même déroulé :
1. Ouverture
2. L'idée
3. Logo principal
4. Construction, zone de protection et tailles minimales
5. Déclinaisons
6. Couleurs et typographie
7. Site web et mobile
8. Camionnette de livraison
9. Emballages
10. Papeterie
11. Réseaux sociaux et application
12. Synthèse

## Logos maîtres

- Le texte est vectorisé avec le crénage réel des polices (HarfBuzz) : les fichiers s'affichent à l'identique partout, sans police installée.
- Les versions monochromes utilisent de vraies réserves transparentes, ce qui les rend utilisables sur photo ou sur n'importe quelle couleur.
- Piste A : `symbole-plein.svg` est la version à utiliser sous 32 px.

## Polices

Toutes sont publiées sous SIL Open Font License 1.1 : usage commercial libre, gratuites (Google Fonts).

| Piste | Logotype | Textes |
|---|---|---|
| A | Cormorant Garamond SemiBold 600 (« et » en italique 500) | Jost |
| B | Fraunces 620, axes SOFT 100 et opsz 72 (« et » en italique 480) | DM Sans |
| C | Bricolage Grotesque Bold 700, chasse 88 %, opsz 96 | Bricolage Grotesque |

## Régénérer

```bash
cd sources && mkdir -p work && ./telecharger-polices.sh
pip install fonttools brotli uharfbuzz
node lockups.js "$PWD" ../logos
node deck.js "$PWD" ../logos ../diapositives
```

Pour `deck.js` :
- `SCALE=2` produit des images 2x ;
- `PDF=chemin.pdf` produit aussi le PDF.

## Mentions

Aucune proposition n'est déclarée juridiquement disponible. Une recherche d'antériorité (INPI, EUIPO) est recommandée avant tout dépôt ou usage commercial. Les valeurs CMJN et Pantone seront établies avec l'imprimeur lors de la finalisation.
