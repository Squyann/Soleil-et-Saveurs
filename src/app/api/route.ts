import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Client Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, metadata } = body;

    // --- 1. VALIDATION DE BASE ---
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Panier vide' }, { status: 400 });
    }

    if (!metadata?.nom || !metadata?.telephone || !metadata?.adresse) {
      return NextResponse.json({ error: 'Informations de livraison manquantes' }, { status: 400 });
    }

    // --- 2. VÉRIFICATION ZONE DE LIVRAISON (78 uniquement) ---
    const cp = metadata.adresse.match(/\b(78\d{3})\b/)?.[1];
    if (!cp) {
      return NextResponse.json(
        { error: 'Adresse hors zone de livraison (78 uniquement)' },
        { status: 400 }
      );
    }

    // --- 3. RÉCUPÉRATION DES PRODUITS DEPUIS SUPABASE ---
    const ids: string[] = items.map((item: any) => String(item.id));

    const { data: products, error: dbError } = await supabase
      .from('products')
      .select('id, name, price, stock')
      .in('id', ids);

    if (dbError || !products) {
      return NextResponse.json(
        { error: 'Erreur lors de la vérification des produits' },
        { status: 500 }
      );
    }

    // --- 4. CALCUL DU TOTAL ET VÉRIFICATION STOCK ---
    let totalProduits = 0;
    const produitsVerifies = [];

    for (const item of items) {
      const productEnBase = products.find((p) => p.id === item.id);

      if (!productEnBase) {
        return NextResponse.json({ error: `Produit introuvable : ${item.id}` }, { status: 400 });
      }

      // Vérification du stock
      if (productEnBase.stock !== null && productEnBase.stock < item.quantite) {
        return NextResponse.json(
          { error: `Stock insuffisant pour : ${productEnBase.name}` },
          { status: 400 }
        );
      }

      const prixUnitaire = parseFloat(productEnBase.price);
      totalProduits += prixUnitaire * item.quantite;

      produitsVerifies.push({
        id: productEnBase.id,
        name: productEnBase.name,
        price: prixUnitaire,
        quantite: item.quantite,
      });
    }

    // Frais de livraison : gratuit dès 45€, sinon 2.50€
    const fraisLivraison = totalProduits < 45 ? 2.5 : 0;
    const totalFinal = totalProduits + fraisLivraison;

    // --- 5. ENREGISTREMENT DE LA COMMANDE ---
    // Puisqu'il n'y a pas Stripe, on passe directement le statut en 'a_preparer' ou 'en_attente'
    const { data: commande, error: insertError } = await supabase
      .from('commandes')
      .insert({
        user_id: metadata.user_id || null,
        items: produitsVerifies,
        total: totalFinal,
        status: 'nouvelle', // Statut par défaut sans paiement en ligne
        adresse_livraison: metadata.adresse,
        methode_paiement: 'Livraison', // Ou 'Espèces/Carte à la livraison'
        nom_client: metadata.nom,
        telephone_client: metadata.telephone,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erreur enregistrement commande:', insertError);
      return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 });
    }

    // On retourne un succès pour rediriger l'utilisateur côté client
    return NextResponse.json({ 
      success: true, 
      message: 'Commande enregistrée avec succès',
      commandeId: commande.id 
    });

  } catch (err: any) {
    console.error('Erreur API:', err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}