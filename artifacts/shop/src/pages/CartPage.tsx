import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, ShoppingCart, Trash2, Plus, Minus, MessageCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { getStore } from "@/lib/api";
import type { Store as StoreType } from "@/lib/api";

export function CartPage() {
  const params = useParams();
  const slug = params.slug ?? "";
  const { items, updateQty, removeItem, clearCart, totalItems, totalPrice } = useCart();
  const [store, setStore] = useState<StoreType | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const wasLight = !html.classList.contains("dark");
    html.classList.add("dark");
    return () => { if (wasLight) html.classList.remove("dark"); };
  }, []);

  useEffect(() => {
    if (!slug) return;
    getStore(slug).then(setStore).catch(() => {});
  }, [slug]);

  const handleWhatsAppOrder = () => {
    if (!store?.whatsapp) return;
    const lines = items.map(item => {
      const price = (item.product.salePrice != null && item.product.salePrice > 0 && item.product.salePrice < item.product.price)
        ? item.product.salePrice! : item.product.price;
      return `• ${item.product.name} × ${item.quantity} — ₹${(price * item.quantity).toLocaleString("en-IN")}`;
    });
    const message = `Hello 👋,\n\nI'd like to order the following:\n\n${lines.join("\n")}\n\n💰 Total: ₹${totalPrice.toLocaleString("en-IN")}\n\nPlease confirm availability and delivery details. Thank you!`;
    const number = store.whatsapp.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground px-4">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="h-14 flex items-center relative z-10">
          <Link
            href={`/store/${slug}`}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-bold text-base">My Cart</span>
              {totalItems > 0 && (
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full leading-none">
                  {totalItems}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Empty state ── */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="w-24 h-24 rounded-full bg-muted/40 flex items-center justify-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div>
            <p className="font-bold text-xl text-foreground">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mt-1.5">Add products from the store to get started</p>
          </div>
          <Button asChild className="rounded-full px-6 mt-1">
            <Link href={`/store/${slug}`}>
              <Store className="h-4 w-4 mr-2" />
              Browse Products
            </Link>
          </Button>
        </div>
      ) : (

        /* ── Cart items ── */
        <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full pb-8">
          <div className="space-y-3 mb-4">
            {items.map(item => {
              const price = (item.product.salePrice != null && item.product.salePrice > 0 && item.product.salePrice < item.product.price)
                ? item.product.salePrice! : item.product.price;
              const lineTotal = price * item.quantity;
              return (
                <div key={item.product.id} className="bg-card border rounded-2xl p-3 flex gap-3 items-center shadow-sm">
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 bg-muted"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{item.product.name}</p>
                    <p className="text-sm font-extrabold text-primary mt-0.5">₹{price.toLocaleString("en-IN")}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        className="w-7 h-7 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors"
                        onClick={() => updateQty(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-bold w-5 text-center tabular-nums">{item.quantity}</span>
                      <button
                        className="w-7 h-7 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors"
                        onClick={() => updateQty(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <span className="ml-auto text-xs font-semibold text-muted-foreground">
                        ₹{lineTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <button
                    className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 text-muted-foreground"
                    onClick={() => removeItem(item.product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Order summary ── */}
          <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
              <span className="font-semibold">₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-extrabold text-primary text-xl">₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="space-y-2">
            <Button
              className="w-full h-12 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-base gap-2 shadow-md"
              onClick={handleWhatsAppOrder}
              disabled={!store?.whatsapp}
            >
              <MessageCircle className="h-5 w-5 fill-white" />
              Order via WhatsApp
            </Button>
            <button
              className="w-full text-xs text-muted-foreground/60 text-center py-1 hover:text-red-400 transition-colors"
              onClick={clearCart}
            >
              Clear cart
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
