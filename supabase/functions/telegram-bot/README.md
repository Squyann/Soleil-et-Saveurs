# Bot Telegram admin — Soleil et Saveurs

Assistant IA (Claude) accessible sur Telegram, réservé à l'administrateur. Il
répond en langage naturel aux questions sur les commandes, le stock et le
chiffre d'affaires en interrogeant la base Supabase.

## Ce que le bot sait faire (MVP 1)

- **Commandes à livrer** pour une date : « Quelles commandes demain ? »
- **Détail d'une commande** : « Détail de la commande 72 »
- **Stock bas / ruptures** : « Quels produits en rupture ? »
- **Chiffre d'affaires** sur une période : « CA de ce mois-ci ? »

_(L'optimisation d'itinéraire de livraison arrivera en MVP 2.)_

## Mise en place (une seule fois)

### 1. Créer le bot Telegram
1. Sur Telegram, ouvre **@BotFather** → `/newbot` → suis les étapes.
2. Récupère le **token** du bot (ex. `123456:ABC-...`).

### 2. Récupérer ton identifiant Telegram
1. Ouvre **@userinfobot** et envoie `/start`.
2. Note ton **Id** (un nombre, ex. `123456789`).

### 3. Obtenir une clé API Anthropic
- Sur https://console.anthropic.com → **API Keys** → crée une clé (`sk-ant-...`).

### 4. Choisir un secret de webhook
- Invente une chaîne aléatoire (ex. `openssl rand -hex 16`). Elle sert à vérifier
  que les requêtes viennent bien de Telegram.

### 5. Configurer les secrets Supabase
Dans le dashboard Supabase → **Edge Functions → Secrets** (ou via CLI) :

```
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=123456:ABC-...
TELEGRAM_ADMIN_CHAT_ID=123456789
TELEGRAM_WEBHOOK_SECRET=<ta chaîne aléatoire>
```

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement.

### 6. Déployer la fonction
```
supabase functions deploy telegram-bot --no-verify-jwt
```
`--no-verify-jwt` est nécessaire : Telegram n'envoie pas de JWT Supabase ; la
sécurité est assurée par le secret de webhook + le filtrage de l'admin.

### 7. Brancher le webhook Telegram
Remplace `<PROJECT_REF>` et les valeurs, puis exécute :
```
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "content-type: application/json" \
  -d '{
    "url": "https://<PROJECT_REF>.functions.supabase.co/telegram-bot",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"
  }'
```

### 8. Tester
Ouvre une conversation avec ton bot sur Telegram, envoie `/start`, puis par
exemple « Quelles commandes à livrer demain ? ».

## Sécurité
- Le webhook rejette toute requête sans le bon `secret_token`.
- Le bot ne répond qu'au `TELEGRAM_ADMIN_CHAT_ID` configuré.
- La base est lue avec la clé `service_role`, côté serveur uniquement.
