
import Stripe from 'stripe';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: "Checkout API active" });
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  //mise en commentaire de la phrase suivante:apiVersion: '2023-10-16', // ou la dernière version
});

export async function POST(req: Request) {
  try {
    const { items, metadata } = await req.json();

    // 1. Préparation des lignes de commande pour Stripe
    const line_items = items.map((item: any) => {
      // Calcul du prix après promotion (logique identique au panier)
      const remise = item.promotion || 0;
      const prixUnitaire = remise > 0 ? item.price * (1 - remise / 100) : item.price;
      
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name.toUpperCase(),
            images: [item.image_url || ''], // Optionnel
          },
          unit_amount: Math.round(prixUnitaire * 100), // Stripe compte en centimes
        },
        quantity: item.quantite,
      };
    });

    // 2. Ajout des frais de livraison si < 45€
    const sousTotal = items.reduce((acc: number, item: any) => acc + (item.price * item.quantite), 0);
    if (sousTotal < 45) {
      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'FRAIS DE LIVRAISON' },
          unit_amount: 250, // 2.50€
        },
        quantity: 1,
      });
    }

    // 3. Création de la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/commande`,
      metadata: {
        nom_client: metadata.nom,
        telephone: metadata.telephone,
        adresse: metadata.adresse,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}