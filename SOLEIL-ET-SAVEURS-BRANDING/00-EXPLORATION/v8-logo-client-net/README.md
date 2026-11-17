# Votre logo, version nette (v8)

Ce dossier contient **votre propre logo** (l'image que vous avez fournie), en version propre :

- **Le dessin est le vôtre.** Le paysage, les légumes, le cadre, le bandeau, les feuilles et les arcs dorés viennent de votre image. Le fond blanc est retiré (fond transparent) et l'image est agrandie ×4 par IA (Real-ESRGAN).
- **Tous les textes sont refaits en vectoriel**, sous forme de tracés. Ils restent parfaitement nets à toutes les tailles :
  - le nom en arc ;
  - « PRIMEUR DEPUIS 1999 » ;
  - « Soleil et Saveurs » ;
  - « FRUITS & LÉGUMES FRAIS / EN LIVRAISON » ;
  - « La fraîcheur au quotidien ».

`AVANT-APRES.png` compare l'image fournie et cette version, avec des zooms.

## Quel fichier utiliser ?

| Besoin | Fichier |
|---|---|
| Site web, e-mails, documents | `…_logo-complet_transparent.png` ou `…_logo-complet.svg` |
| Impression (flyers, cartes, autocollants, camion) | `…_logo-complet.pdf` (ou `…_embleme.pdf`) |
| Photo de profil Facebook / Instagram | `…_photo-profil.png` (fond blanc) ou `…_photo-profil_fond-creme.png` |
| Emblème rond seul | `…_embleme.*` |
| Nom seul (sans l'emblème) | `…_logotype.*` |

`apercu_photo-profil-ronde.png` montre le recadrage rond : l'emblème entier tient dans le cercle.

Formats fournis :

- **PNG**, en transparent et sur fond blanc :
  - logo complet en 4000 px de large ;
  - emblème et logotype en 3000 px.
- **SVG** : les textes sont en tracés et l'illustration est intégrée en 2×, un format léger pour le web.
- **PDF** : les textes sont en tracés et l'illustration est intégrée en 4×, pour l'impression. Aucune police n'est à installer.

## Textes et polices

Toutes ces polices sont libres d'usage commercial.

| Texte | Police | Licence |
|---|---|---|
| Nom en arc, bandeau | Cinzel Bold | SIL OFL |
| Grandes capitales « S » | Playfair Display Black | SIL OFL |
| « oleil », « aveurs » | Gloock | SIL OFL |
| « et » | Playfair Display Italic ExtraBold | SIL OFL |
| Descripteur | Montserrat SemiBold | SIL OFL |
| Signature | Satisfy | Apache 2.0 |

Les lettres de l'image fournie ne viennent pas d'une vraie police. Pour chaque texte, la police retenue est celle qui recouvre le mieux le lettrage d'origine : elles ont été comparées par superposition, avec un score de recouvrement. Les positions et les tailles sont calées au pixel sur l'original. Le détail est dans `_sources-generation/hybrid-params.json`.

## Couleurs

| Rôle | HEX | RVB |
|---|---|---|
| Vert des textes | `#162E0E` | 22, 46, 14 |
| Orange du « et » | `#C94A08` | 201, 74, 8 |
| Crème du bandeau | `#FBF4E2` | 251, 244, 226 |
| Or (étoiles, tirets) | `#F7C95A` → `#D88E1C` | dégradé |

## Limites à connaître

- **Taille maximale.** L'illustration reste une image, agrandie ×4. Elle est nette jusqu'à environ **30 cm de large** pour l'emblème, imprimé à 300 dpi, ce qui suffit pour les flyers, les cartes, les autocollants et le flocage d'un véhicule vu à distance. Pour une enseigne de plusieurs mètres, il faut une illustration 100 % vectorielle (c'est le cas du kit officiel 01 → 09, en papier découpé).
- **Lettres très légèrement différentes.** Les textes sont désormais réguliers, alors que ceux de l'image d'origine présentaient de petites irrégularités.

## Régénérer

Les scripts sont dans `_sources-generation/`. Ils s'exécutent dans cet ordre :

1. `hybrid_prep.py` : découpe de l'emblème, effacement des textes, détourage, mesures.
2. `hybrid_right.py` : décors de droite, avec les textes effacés et les traits dorés raccordés.
3. `esrgan_onnx.py` : agrandissement ×4 par Real-ESRGAN, sans PyTorch.
   - Modèle : `RealESRGAN_x4plus.pth` (licence BSD-3), téléchargé depuis les « releases » GitHub de xinntao/Real-ESRGAN.
4. `hybrid_alpha.py` : transparence haute définition, sans liseré blanc.
5. `fit_fonts.py` : choix des polices par superposition.
6. `hybrid.js` : assemblage SVG.
7. `hybrid_export.js` : exports.
8. `hybrid_compare.py` : planche avant / après.
