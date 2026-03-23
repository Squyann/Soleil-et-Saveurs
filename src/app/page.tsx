import { supabase } from "../lib/supabase"
import { Button } from "@/components/ui/button"
import { Sun, ShoppingBasket, Star } from "lucide-react"

export default async function Home() {
  // 1. On récupère les produits depuis Supabase
  const { data: products, error } = await supabase
    .from('products')
    .select('*')

  return (
    <main className="flex min-h-screen flex-col bg-[#fffdfa]">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-8">
        <div className="relative">
          <Sun className="w-16 h-16 text-orange-500 animate-pulse" />
          <Star className="absolute -top-2 -right-2 text-yellow-400 fill-yellow-400 w-6 h-6" />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-orange-900">
          Soleil <span className="text-orange-600">&</span> Saveurs
        </h1>
        <p className="text-xl text-stone-600 max-w-xl mx-auto italic">
          "Le goût du soleil, directement chez vous."
        </p>
      </section>

      {/* Grille des Produits */}
      <section className="container mx-auto px-4 pb-20">
        <h2 className="text-3xl font-bold text-stone-800 mb-10 border-l-4 border-orange-500 pl-4">
          Nos arrivages du jour
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products?.map((product) => (
            <div key={product.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-orange-50 hover:shadow-xl transition-shadow group">
              <div className="h-64 overflow-hidden">
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-stone-900">{product.name}</h3>
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">
                    {product.price}€
                  </span>
                </div>
                <p className="text-stone-500 text-sm line-clamp-2">
                  {product.description}
                </p>
                <Button className="w-full bg-orange-600 hover:bg-orange-700 rounded-xl py-6">
                  Ajouter au panier
                </Button>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-red-500 text-center">Erreur lors du chargement des produits.</p>}
      </section>

      <footer className="p-8 border-t border-orange-100 bg-white/50 text-center text-stone-400">
        Soleil et Saveurs — Produits frais & Responsables
      </footer>
    </main>
  )
}