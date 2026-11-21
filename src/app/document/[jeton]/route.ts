// Page du document pro envoyé au client (lien secret reçu par e-mail) :
// la facture, le bon ou l'avoir émis, prêt à imprimer ou à enregistrer en PDF.

import { createClient } from '@supabase/supabase-js';
import { htmlDocumentPro, type DocumentPro } from '@/lib/facturePro';

const PAGE_INTROUVABLE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Document introuvable</title><meta name="robots" content="noindex"></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#F3E8D6;color:#2F4A2B;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">
<div><h1 style="font-family:Georgia,serif;font-weight:400">Document introuvable</h1><p>Ce lien n'est pas valide. Contactez Soleil et Saveurs au 07 59 72 00 83.</p></div></body></html>`;

const BOUTON = `<style>@media print { .imprimer { display: none !important; } }</style>
<button class="imprimer" onclick="window.print()" style="position:fixed;right:16px;bottom:16px;padding:14px 20px;border:0;border-radius:14px;background:#2F4A2B;color:#F3E8D6;font:700 15px system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25);cursor:pointer">Imprimer / enregistrer en PDF</button>`;

export async function GET(_req: Request, { params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const entetes = { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jeton)) return new Response(PAGE_INTROUVABLE, { status: 404, headers: entetes });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('document_pro_public', { p_jeton: jeton });
  if (error || !data) return new Response(PAGE_INTROUVABLE, { status: 404, headers: entetes });
  const html = htmlDocumentPro(data as DocumentPro).replace('</body>', `${BOUTON}</body>`);
  return new Response(html, { status: 200, headers: entetes });
}
