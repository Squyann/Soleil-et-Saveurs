---
name: vector-design
description: Créer, nettoyer, corriger et exporter des logos vectoriels SVG propres, responsives et modifiables.
---

# Vector Design

## Objectif
Produire des fichiers SVG robustes, légers et indépendants d'un logiciel propriétaire.

## Exigences SVG
- Utiliser `viewBox` correctement et conserver les proportions.
- Préférer les formes et tracés vectoriels propres ; éviter les images raster intégrées.
- Éviter les filtres lourds, masques complexes et effets qui nuisent à la compatibilité.
- Définir des couleurs explicites et cohérentes avec la charte.
- Garder un code lisible, structuré et commenté lorsque cela aide la maintenance.
- Vérifier l'affichage dans un navigateur et sur fond clair/sombre.
- Prévoir une variante monochrome et une variante sans texte si nécessaire.
- Ne pas convertir le texte en tracés sans conserver aussi une version éditable avec texte, lorsque la police est disponible.

## Exports
Selon les outils installés, produire :
- SVG maître
- PNG transparent en 1x, 2x et 4x ou dimensions demandées
- PDF vectoriel
- EPS si un convertisseur adapté est disponible
- favicon ICO et PNG 16, 32, 48, 180, 192 et 512 px
- versions optimisées pour web

Ne jamais prétendre avoir généré un format si l'outil requis n'est pas disponible. Indiquer les dépendances nécessaires et les commandes utilisées.
