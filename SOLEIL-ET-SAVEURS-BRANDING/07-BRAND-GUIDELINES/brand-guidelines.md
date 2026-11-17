# Soleil et Saveurs — Charte graphique (version texte)

Version 1.0 · novembre 2026. La charte complète, illustrée, est dans `Soleil-et-Saveurs-charte-graphique.pdf`.

Dans ce document :
- **Obligatoire** signale une règle qui garantit la reconnaissance de la marque ;
- **Recommandation** signale une règle qui laisse une marge d'adaptation.

---

## 1. La marque

| | |
|---|---|
| **Positionnement** | Le savoir-faire d'un primeur, livré à domicile. Métier de primeur exercé depuis 1999. Vente et livraison de fruits et légumes frais aux particuliers des Yvelines (78) : sélection pièce par pièce, produits choisis à maturité, livraison dès le lendemain. |
| **Idée de marque** | « Le soleil se goûte. » Le soleil mûrit le fruit, le primeur choisit le meilleur, Soleil et Saveurs le livre. *(Idée directrice interne, pas un slogan.)* |
| **Personnalité** | Chaleureuse, généreuse, experte, fiable, simple. |
| **Public** | Particuliers et familles des Yvelines qui veulent des produits de qualité sans se déplacer au marché. |
| **Ton** | Proche et précis : on parle de produits, de saisons et de goût, sans jargon ni promesse excessive. Vouvoiement, phrases courtes. |
| **Valeurs** | Fraîcheur et qualité · sélection rigoureuse · proximité · authenticité du métier · simplicité de la livraison · confiance. |

## 2. Le logo

**L'emblème « Arche titrée »** : une arche cadre un paysage en papier découpé.
- Le soleil se lève dans son halo, derrière trois plans de collines.
- L'horizon est un étal : poireaux, chou, tomate, poire.
- Le nom *SOLEIL ET SAVEURS* suit la courbe de l'arche.
- Un bandeau vert porte la mention *PRIMEUR DEPUIS 1999*.

**La version en longueur** (horizontale) associe l'arche sans texte, le nom en Fraunces et le descripteur « PRIMEUR · FRUITS & LÉGUMES » en DM Sans. Le descripteur est justifié sur la largeur du nom.

### Versions (fichiers dans `01-LOGO-SOURCE`)

| Version | Usage |
|---|---|
| `embleme` | **Le logo** (référence). Emballages, cagettes, autocollants, véhicule, avatar, enseigne, affiches. |
| `logo-horizontal` | **Version en longueur.** En-tête du site, documents, factures, signatures : quand l'emblème est trop haut. |
| `logo-vertical` | Formats hauts et étroits : affiches, kakémonos. |
| `logo-horizontal-sans-descripteur` | Petits formats (moins de 260 px de large) : en-tête mobile. |
| `symbole` | Icône d'application, réseaux sociaux, motifs, quand le nom est déjà présent. |
| `symbole-simplifie` | Sous 40 px : favicon, petites icônes. |

Chaque version existe pour fond clair (`fond-clair`) et pour fond sombre (`fond-sombre`). Les versions monochromes, noir et blanc, sont dans `06-MONOCHROME`.

### Relief ou à plat — Obligatoire

- **Relief**, avec des ombres douces entre les plans : **écrans uniquement** (site, réseaux, vidéo, application). Fichiers SVG et PNG.
- **À plat** (`_a-plat`), 100 % vectoriel et sans effet : **toute impression** (sacs, étiquettes, cartes, véhicule, enseigne). Fichiers PDF et EPS.

## 3. Zone de protection et tailles minimales — Obligatoire

**Zone de protection :**
- logo horizontal : **x = la hauteur de la capitale « S » du nom** ;
- emblème et symbole : **x = un quart de la largeur de l'arche**.

Aucun élément ne doit entrer dans cette zone.

| Version | Taille minimale |
|---|---|
| Logo horizontal avec descripteur | 65 mm · 260 px de large |
| Logo horizontal sans descripteur | 30 mm · 120 px de large |
| Emblème (lisibilité du nom et du bandeau) | 40 mm · 160 px de haut |
| Symbole détaillé | 12 mm · 40 px de haut |
| Symbole simplifié | 5 mm · 16 px |

## 4. Fonds autorisés

- **Fonds autorisés :** Lin (fond de référence), blanc, Vert olivier (avec la version fond sombre).
- **Sur une photo ou l'illustration :** uniquement l'emblème version fond clair, dont le cartouche lin assure la lisibilité.
- **Jamais :** le logo horizontal sur un fond chargé.

## 5. Les interdits — Obligatoire

Il est interdit de :
- déformer ou étirer le logo ;
- changer ses couleurs ;
- l'incliner ou le faire pivoter ;
- ajouter des ombres ou des effets ;
- réduire son opacité ;
- poser le logo horizontal sur un fond chargé ;
- recadrer l'emblème, retirer le nom en arc ou le bandeau ;
- recomposer le nom dans une autre police ;
- utiliser la version relief à l'impression.

## 6. Couleurs

Les valeurs CMJN sont **indicatives**. Elles ont été calculées par conversion ICC : profil sRGB vers le profil CMJN générique de Ghostscript (`default_cmyk.icc`), intention colorimétrique relative. **Elles sont à valider avec l'imprimeur**, selon son papier et son profil (par exemple FOGRA39 / ISO Coated v2), sur bon à tirer. Les références Pantone sont à établir avec lui sur nuancier.

### Palette principale — Obligatoire

| Nom | HEX | RVB | CMJN indicatif | Rôle |
|---|---|---|---|---|
| Vert olivier | `#2F4A2B` | 47 · 74 · 43 | 79 · 48 · 96 · 58 | Textes, nom, cadre, fonds sombres |
| Terre cuite | `#C2602D` | 194 · 96 · 45 | 18 · 76 · 100 · 7 | Descripteur, ciel, accents |
| Safran | `#ECAD44` | 236 · 173 · 68 | 6 · 36 · 92 · 0 | Le soleil, mises en avant |
| Lin | `#F3E8D6` | 243 · 232 · 214 | 4 · 7 · 16 · 0 | Fond de référence, papier |

### Palette secondaire — illustration et accents

| Nom | HEX | RVB | CMJN indicatif |
|---|---|---|---|
| Olivier profond | `#22371F` | 34 · 55 · 31 | 75 · 55 · 82 · 74 |
| Brique | `#A94E25` | 169 · 78 · 37 | 24 · 83 · 100 · 18 |
| Halo | `#D7803F` | 215 · 128 · 63 | 13 · 60 · 96 · 1 |
| Miel | `#F2C46B` | 242 · 196 · 107 | 4 · 24 · 71 · 0 |
| Sauge | `#6F8A50` | 111 · 138 · 80 | 62 · 30 · 91 · 12 |
| Sauge claire | `#9DB07A` | 157 · 176 · 122 | 43 · 20 · 67 · 1 |
| Sauge pâle | `#B9C79A` | 185 · 199 · 154 | 30 · 12 · 49 · 0 |
| Tomate | `#B83A26` | 184 · 58 · 38 | 19 · 96 · 100 · 12 |
| Poire | `#B3B65A` | 179 · 182 · 90 | 34 · 19 · 86 · 0 |
| Chou | `#4C7A3A` | 76 · 122 · 58 | 76 · 32 · 100 · 20 |

**Proportions recommandées :** Lin 50 % · Vert olivier 30 % · Terre cuite 12 % · Safran 8 %.

### Contrastes des textes (WCAG 2.1)

| Texte / fond | Contraste | Usage |
|---|---|---|
| Vert olivier sur Lin | 8,11 : 1 | Texte courant (AA) |
| Vert olivier sur Blanc | 9,83 : 1 | Texte courant (AA) |
| Lin sur Vert olivier | 8,11 : 1 | Texte courant (AA) |
| Miel sur Vert olivier | 6,03 : 1 | Texte courant (AA) |
| Safran sur Vert olivier | 4,98 : 1 | Texte courant (AA) |
| Brique sur Lin | 4,55 : 1 | Texte courant (AA) |
| Blanc sur Brique | 5,52 : 1 | Texte courant (AA) |
| Terre cuite sur Lin | 3,46 : 1 | Grands textes et titres uniquement |
| Blanc sur Terre cuite | 4,20 : 1 | Grands textes et titres uniquement |

**Recommandation pour le site :**
- petits textes et liens d'accent en **Brique `#A94E25`** ;
- boutons d'accent en **fond Brique, texte blanc** ;
- boutons principaux en **fond Vert olivier, texte Lin**.

## 7. Typographie

| Usage | Police | Réglages | Licence | Alternative |
|---|---|---|---|---|
| Titres et nom | **Fraunces** (variable) | Graisse 600–620, SOFT 100, taille optique 72 ; italique 480 pour les mots d'accent | SIL Open Font License 1.1, Google Fonts : usage commercial libre et gratuit | Georgia, serif |
| Textes et mentions | **DM Sans** | Regular 400 pour les textes ; SemiBold 600 en capitales espacées (+200 à +320) pour les mentions et le descripteur | SIL Open Font License 1.1, Google Fonts | system-ui, Helvetica, Arial, sans-serif |

**Hiérarchie recommandée :**

| Élément | Réglage |
|---|---|
| Titre 1 | Fraunces 600, 46–68 px, interligne 1,0 |
| Titre 2 | Fraunces 600, 30–40 px, interligne 1,1 |
| Surtitre | DM Sans 600, 11–13 px, capitales, +200 |
| Texte courant | DM Sans 400, 16–18 px, interligne 1,6 |
| Bouton | DM Sans 500, 15 px |

## 8. Illustration de marque « Du champ à votre porte »

Le paysage prolonge le logo :
- le soleil et son halo ;
- les vergers et les champs sillonnés ;
- la route et la camionnette ;
- l'étal au premier plan.

On peut le recadrer librement (bandeau du site, sacs, véhicule, publications), mais pas le déformer ni changer ses couleurs. Le logo se pose sur le ciel, jamais sur les produits.

## 9. Applications

| Support | Règle |
|---|---|
| En-tête du site | Logo horizontal, fond Lin. Sous 260 px de large, version sans descripteur. |
| Favicon | `05-FAVICON` (symbole simplifié). |
| Avatar des réseaux | Emblème sur fond Lin, dans un cercle. |
| Icône d'application | Symbole sur fond Vert olivier. |
| Cartes et papier à en-tête | Logo horizontal à plat, coordonnées en DM Sans, filet Brique. |
| Signature e-mail | Symbole et nom en Fraunces, coordonnées en DM Sans, lien en Brique. |
| Publications | Illustration en fond, titre en Fraunces sur le ciel, emblème en signature. |

## 10. Fichiers fournis

| Dossier | Contenu |
|---|---|
| `01-LOGO-SOURCE` | SVG maîtres, texte vectorisé : relief et à plat, fond clair et fond sombre. Versions `_texte-editable` (Fraunces et DM Sans doivent être installées). |
| `02-LOGO-PNG` | PNG transparents en 1x, 2x et 4x (versions écran). |
| `03-LOGO-PDF` | PDF vectoriels à plat : aucune image matricielle, vérifié avec `pdfimages`. |
| `04-LOGO-EPS` | EPS vectoriels à plat, convertis avec `pdftops -eps` (poppler). |
| `05-FAVICON` | `favicon.ico` (16/32/48), `favicon.svg`, PNG 16/32/48, `apple-touch-icon.png` (180), icônes 192 et 512 (dont maskable), `site.webmanifest`. |
| `06-MONOCHROME` | Noir et blanc en SVG, PNG, PDF et EPS. Les réserves sont de vraies découpes vectorielles (opérations booléennes), sans masque. |
| `07-BRAND-GUIDELINES` | La charte en PDF et ce fichier. |
| `08-MOCKUPS` | Mises en situation : site, camionnette, sac et cagette, étiquettes, papeterie, réseaux sociaux, présentation. |

## 11. Points à confirmer

- Les valeurs CMJN et Pantone, avec l'imprimeur (bon à tirer).
- **Juridique :** aucune disponibilité de marque n'est garantie. Une recherche d'antériorité (INPI, EUIPO) est recommandée avant dépôt ou usage commercial étendu.
