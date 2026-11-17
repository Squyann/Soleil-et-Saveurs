# Favicon et icônes — Soleil et Saveurs

| Fichier | Taille | Usage |
|---|---|---|
| `favicon.ico` | 16, 32, 48 | Navigateurs (onglet), compatibilité maximale |
| `favicon.svg` | vectoriel | Navigateurs récents |
| `favicon-16x16.png`, `-32x32`, `-48x48` | 16, 32, 48 | Symbole simplifié en PNG |
| `apple-touch-icon.png` | 180 | Écran d'accueil iPhone et iPad |
| `icon-192.png`, `icon-512.png` | 192, 512 | Android, application web |
| `icon-maskable-512.png` | 512 | Android (icône adaptative, marge de sécurité incluse) |
| `site.webmanifest` | — | Manifeste d'application web |

Le favicon utilise le **symbole simplifié**. Les icônes de 180 px et plus utilisent le symbole détaillé sur fond Lin.

## Intégration HTML

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#2F4A2B">
```
