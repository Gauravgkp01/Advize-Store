import { useState, useEffect } from "react";
import { getStore, type Store } from "@/lib/api";

const STORE_ID_KEY = "shop_store_id";
const STORE_SLUG_KEY = "shop_store_slug";

export function useStore() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const savedSlug = localStorage.getItem(STORE_SLUG_KEY);
        if (savedSlug) {
          try {
            const s = await getStore(savedSlug);
            if (!cancelled) setStore(s);
          } catch {
            // Stale slug — clear it so the user can create a fresh store
            localStorage.removeItem(STORE_ID_KEY);
            localStorage.removeItem(STORE_SLUG_KEY);
          }
        }
        // If no slug, leave store null — dashboard shows empty state
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
    try {
      const s = await getStore(slug);
      setStore(s);
    } catch {}
  };

  return { store, loading, error, refreshStore, setStore };
}
