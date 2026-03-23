"use client"
import { useCart } from "@/lib/store"
import { ShoppingCart, Sun } from "lucide-react"

export default function Navbar() {
  const cart = useCart((state) => state.cart);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-orange-600 text-xl">
          <Sun className="w-6 h-6" />
          <span>Soleil & Saveurs</span>
        </div>
        
        <div className="relative p-2 bg-orange-50 rounded-full text-orange-700">
          <ShoppingCart className="w-6 h-6" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white">
              {totalItems}
            </span>
          )}
        </div>
      </div>
    </nav>
  )
}