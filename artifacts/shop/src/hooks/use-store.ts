import { useState, useEffect } from "react";
import { createStore, getStore, type Store } from "@/lib/api";

const STORE_ID_KEY = "shop_store_id";
const STORE_SLUG_KEY = "shop_store_slug";

const DEFAULT_STORE = {
  name: "My Shop",
  slug: `myshop-${Math.random().toString(36).slice(2, 8)}`,
  whatsapp: "",
  category: "General",
  location: "",
};

export function useStore() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const savedId = localStorage.getItem(STORE_ID_KEY);
        const savedSlug = localStorage.getItem(STORE_SLUG_KEY);

        if (savedId && savedSlug) {
          const s = await getStore(savedSlug);
          if (!cancelled) setStore(s);
        } else {
          const slug = DEFAULT_STORE.slug;
          const s = await createStore({ ...DEFAULT_STORE, slug });
          localStorage.setItem(STORE_ID_KEY, s.id);
          localStorage.setItem(STORE_SLUG_KEY, s.slug);
          if (!cancelled) setStore(s);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load store");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const refreshStore = async () => {
    const slug = localStorage.getItem(STORE_SLUG_KEY);
    if (!slug) return;
    const s = await getStore(slug);
    setStore(s);
  };

  return { store, loading, error, refreshStore, setStore };
}
