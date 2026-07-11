// Bot Telegram admin pour Soleil et Saveurs.
//
// L'admin pose des questions en langage naturel ("quelles commandes pour
// demain ?", "combien de CA ce mois ?", "quels produits en rupture ?") et
// Claude répond en interrogeant la base via des outils (tool use).
//
// Sécurité :
//  - le webhook vérifie l'en-tête secret Telegram (TELEGRAM_WEBHOOK_SECRET) ;
//  - le bot ne répond qu'au chat administrateur (TELEGRAM_ADMIN_CHAT_ID) ;
//  - la base est lue avec la clé service_role (jamais exposée au client).
//
// Variables d'environnement (Supabase → Edge Functions → Secrets) :
//  - ANTHROPIC_API_KEY
//  - TELEGRAM_BOT_TOKEN
//  - TELEGRAM_ADMIN_CHAT_ID
//  - TELEGRAM_WEBHOOK_SECRET
//  - (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement)

import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID")!;
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODEL = "claude-opus-4-8";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Outils que Claude peut appeler
// ---------------------------------------------------------------------------
const tools = [
  {
    name: "commandes_par_date",
    description:
      "Liste les commandes dont la date de livraison correspond à la date donnée. Utilise cet outil pour répondre aux questions du type « quelles commandes à livrer le … ? ».",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date de livraison au format AAAA-MM-JJ",
        },
      },
      required: ["date"],
    },
  },
  {
    name: "detail_commande",
    description:
      "Renvoie le détail complet d'une commande (client, adresse, téléphone, articles, total, statut) à partir de son numéro.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Numéro de la commande" },
      },
      required: ["id"],
    },
  },
  {
    name: "produits_stock_bas",
    description:
      "Liste les produits dont le stock est inférieur ou égal à un seuil (par défaut 5). Sert à repérer les ruptures et les stocks faibles.",
    input_schema: {
      type: "object",
      properties: {
        seuil: {
          type: "number",
          description: "Seuil de stock (par défaut 5)",
        },
      },
      required: [],
    },
  },
  {
    name: "chiffre_affaires",
    description:
      "Calcule le chiffre d'affaires (total des commandes livrées) entre deux dates de commande incluses.",
    input_schema: {
      type: "object",
      properties: {
        date_debut: { type: "string", description: "Date de début AAAA-MM-JJ" },
        date_fin: { type: "string", description: "Date de fin AAAA-MM-JJ" },
      },
      required: ["date_debut", "date_fin"],
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Implémentation des outils
// ---------------------------------------------------------------------------
function resumePanier(contenu: unknown): string {
  if (!Array.isArray(contenu)) return "—";
  return contenu
    .map((i: any) => `${i.quantite ?? i.quantity ?? "?"}× ${i.nom ?? i.name ?? "?"}`)
    .join(", ");
}

async function executerOutil(nom: string, input: any): Promise<string> {
  try {
    if (nom === "commandes_par_date") {
      const { data, error } = await supabase
        .from("commandes")
        .select("id, nom_client, telephone_client, adresse_livraison, total, statut, contenu_panier, creneau_livraison")
        .eq("date_livraison", input.date)
        .order("id", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return "Aucune commande pour cette date.";
      return JSON.stringify(
        data.map((c) => ({
          id: c.id,
          client: c.nom_client,
          telephone: c.telephone_client,
          adresse: c.adresse_livraison,
          creneau: c.creneau_livraison,
          total: c.total,
          statut: c.statut,
          articles: resumePanier(c.contenu_panier),
        })),
      );
    }

    if (nom === "detail_commande") {
      const { data, error } = await supabase
        .from("commandes")
        .select("*")
        .eq("id", input.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return "Commande introuvable.";
      return JSON.stringify({
        id: data.id,
        client: data.nom_client,
        email: data.email_client,
        telephone: data.telephone_client,
        adresse: data.adresse_livraison,
        date_livraison: data.date_livraison,
        creneau: data.creneau_livraison,
        total: data.total,
        statut: data.statut,
        commentaire: data.commentaire_client,
        articles: resumePanier(data.contenu_panier),
      });
    }

    if (nom === "produits_stock_bas") {
      const seuil = typeof input.seuil === "number" ? input.seuil : 5;
      const { data, error } = await supabase
        .from("products")
        .select("name, stock, unite, category")
        .lte("stock", seuil)
        .order("stock", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return `Aucun produit au stock ≤ ${seuil}.`;
      return JSON.stringify(
        data.map((p) => ({ produit: p.name, stock: p.stock, unite: p.unite, categorie: p.category })),
      );
    }

    if (nom === "chiffre_affaires") {
      const { data, error } = await supabase
        .from("commandes")
        .select("total, created_at, statut")
        .gte("created_at", `${input.date_debut}T00:00:00`)
        .lte("created_at", `${input.date_fin}T23:59:59`)
        .eq("statut", "livrée");
      if (error) throw error;
      const total = (data ?? []).reduce((acc, c) => acc + (Number(c.total) || 0), 0);
      return JSON.stringify({
        chiffre_affaires: Math.round(total * 100) / 100,
        nombre_commandes_livrees: data?.length ?? 0,
        periode: `${input.date_debut} → ${input.date_fin}`,
      });
    }

    return `Outil inconnu : ${nom}`;
  } catch (e) {
    return `Erreur outil ${nom} : ${(e as Error).message}`;
  }
}

// ---------------------------------------------------------------------------
// Appel Claude avec boucle de tool use
// ---------------------------------------------------------------------------
async function anthropicMessages(body: unknown) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function repondre(question: string): Promise<string> {
  const aujourdhui = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }); // AAAA-MM-JJ
  const system =
    `Tu es l'assistant de gestion de "Soleil et Saveurs", une entreprise de livraison de fruits et légumes frais dans les Yvelines (78). ` +
    `Tu réponds à l'administrateur en français, de façon concise et directe, en interrogeant la base via les outils fournis. ` +
    `La date d'aujourd'hui est ${aujourdhui} (Europe/Paris). Interprète les dates relatives ("demain", "ce samedi", "ce mois-ci") par rapport à cette date. ` +
    `Pour lister des commandes à livrer, utilise la date de livraison. Formate les réponses pour Telegram : listes claires, montants en euros. ` +
    `Ne montre pas ton raisonnement, donne directement la réponse finale.`;

  const messages: any[] = [{ role: "user", content: question }];

  // Boucle : au plus 6 itérations pour éviter tout emballement.
  for (let i = 0; i < 6; i++) {
    const rep = await anthropicMessages({
      model: MODEL,
      max_tokens: 2048,
      system,
      tools,
      messages,
    });

    if (rep.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: rep.content });
      const resultats = [];
      for (const bloc of rep.content) {
        if (bloc.type === "tool_use") {
          const sortie = await executerOutil(bloc.name, bloc.input);
          resultats.push({ type: "tool_result", tool_use_id: bloc.id, content: sortie });
        }
      }
      messages.push({ role: "user", content: resultats });
      continue;
    }

    // Réponse finale
    const texte = (rep.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim();
    return texte || "Je n'ai pas de réponse.";
  }

  return "Désolé, la requête est trop complexe pour l'instant.";
}

// ---------------------------------------------------------------------------
// Telegram
// ---------------------------------------------------------------------------
async function envoyerTelegram(chatId: string | number, texte: string) {
  // Telegram limite à 4096 caractères par message.
  for (let i = 0; i < texte.length; i += 4000) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texte.slice(i, i + 4000) }),
    });
  }
}

Deno.serve(async (req) => {
  // Vérifie que la requête vient bien de Telegram.
  if (req.headers.get("x-telegram-bot-api-secret-token") !== TELEGRAM_WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const message = update.message ?? update.edited_message;
  const chatId = message?.chat?.id;
  const texte: string = message?.text ?? "";

  // On répond immédiatement 200 à Telegram ; le traitement continue en tâche de fond.
  const traitement = (async () => {
    if (!chatId) return;

    // Seul l'administrateur est autorisé.
    if (String(chatId) !== String(TELEGRAM_ADMIN_CHAT_ID)) {
      await envoyerTelegram(chatId, "Accès réservé à l'administrateur.");
      return;
    }
    if (!texte) return;
    if (texte === "/start") {
      await envoyerTelegram(
        chatId,
        "Bonjour 👋 Je suis l'assistant Soleil et Saveurs.\n\nPose-moi des questions comme :\n• Quelles commandes à livrer demain ?\n• Détail de la commande 72\n• Quels produits en rupture de stock ?\n• Quel chiffre d'affaires ce mois-ci ?",
      );
      return;
    }

    try {
      const reponse = await repondre(texte);
      await envoyerTelegram(chatId, reponse);
    } catch (e) {
      console.error(e);
      await envoyerTelegram(chatId, "Une erreur est survenue en traitant ta demande.");
    }
  })();

  // @ts-ignore - EdgeRuntime est fourni par Supabase pour le travail en arrière-plan.
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(traitement);
  else await traitement;

  return new Response("ok");
});
