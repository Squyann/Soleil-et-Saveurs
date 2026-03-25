import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Client Supabase avec la clé SERVICE (jamais exposée côté client)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // clé secrète, pas la anon key
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, metadata } = body;

    // --- VALIDATION DE BASE ---
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Panier vide' }, { status: 400 });
    }

    if (!metadata?.nom || !metadata?.telephone || !metadata?.adresse) {
      return NextResponse.json({ error: 'Informations de livraison manquantes' }, { status: 400 });
    }

    // --- VÉRIFICATION ZONE DE LIVRAISON CÔTÉ SERVEUR ---
    const cp = metadata.adresse.match(/\b(78\d{3})\b/)?.[1];
    if (!cp) {
      return NextResponse.json(
        { error: 'Adresse hors zone de livraison (78 uniquement)' },
        { status: 400 }
      );
    }

    // --- RÉCUPÉRATION DES VRAIS PRIX DEPUIS SUPABASE ---
    // Les ids sont des uuid (string) — on les envoie tels quels
    const ids: string[] = items.map((item: any) => String(item.id));

    const { data: products, error: dbError } = await supabase
      .from('products')                               // ← nom réel de la table
      .select('id, name, price, stock, description')  // ← colonnes réelles
      .in('id', ids);

    if (dbError || !products) {
      console.error('Erreur Supabase:', dbError);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification des produits' },
        { status: 500 }
      );
    }

    // --- CONSTRUCTION DES LINE ITEMS STRIPE AVEC LES VRAIS PRIX ---
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const produitsVerifies: object[] = [];

    for (const item of items) {
      // Comparaison uuid string → string
      const productEnBase = products.find((p) => p.id === item.id);

      if (!productEnBase) {
        return NextResponse.json(
          { error: `Produit introuvable : ${item.id}` },
          { status: 400 }
        );
      }

      // Vérification du stock
      if (productEnBase.stock !== null && productEnBase.stock < item.quantite) {
        return NextResponse.json(
          { error: `Stock insuffisant pour : ${productEnBase.name}` },
          { status: 400 }
        );
      }

      // On utilise le VRAI prix depuis la base — jamais item.price
      const vraiPrixCentimes = Math.round(parseFloat(productEnBase.price) * 100);

      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: productEnBase.name,
            ...(productEnBase.description
              ? { description: productEnBase.description }
              : {}),
          },
          unit_amount: vraiPrixCentimes, // ← prix vérifié côté serveur
        },
        quantity: item.quantite,
      });

      produitsVerifies.push({
        id: productEnBase.id,
        name: productEnBase.name,
        price: parseFloat(productEnBase.price),
        quantite: item.quantite,
      });
    }

    // --- CALCUL DU TOTAL RÉEL ---
    const totalEuros = lineItems.reduce(
      (acc, li) =>
        acc + ((li.price_data as any).unit_amount / 100) * (li.quantity as number),
      0
    );

    // Frais de livraison : gratuit dès 45€, sinon 2.50€
    if (totalEuros < 45) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Frais de livraison' },
          unit_amount: 250,
        },
        quantity: 1,
      });
    }

    // --- CRÉATION SESSION STRIPE ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/commander`,
      metadata: {
        nom: metadata.nom,
        telephone: metadata.telephone,
        adresse: metadata.adresse,
        user_id: metadata.user_id || '',
      },
    });

    // --- PRÉ-ENREGISTREMENT EN BASE ---
    const { error: insertError } = await supabase.from('commandes').insert({
      stripe_session_id: session.id,
      user_id: metadata.user_id || null,
      items: produitsVerifies,
      total: totalEuros < 45 ? totalEuros + 2.5 : totalEuros,
      status: 'en_attente_paiement',
      adresse_livraison: metadata.adresse,
      methode_paiement: 'Ligne',
      nom_client: metadata.nom,
      telephone_client: metadata.telephone,
    });

    if (insertError) {
      console.error('Erreur pré-enregistrement commande:', insertError);
    }

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error('Erreur checkout:', err);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}