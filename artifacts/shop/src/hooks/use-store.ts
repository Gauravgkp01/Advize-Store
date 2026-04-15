import { useState, useEffect } from "react";
import { getStore, getStoreByOwnerId, type Store } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const STORE_ID_KEY = "shop_store_id";
const STORE_SLUG_KEY = "shop_store_slug";

export function useStore() {
  const { user, loading: authLoading } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        if (user) {
          try {
            const s = await getStoreByOwnerId(user.uid);
            if (!cancelled) {
              setStore(s);
              localStorage.setItem(STORE_ID_KEY, s.id);
              localStorage.setItem(STORE_SLUG_KEY, s.slug);
            }
            return;
          } catch {
            // No store found for this user — fall through to legacy lookup
          }
        }

        // Legacy: look up by localStorage slug (for existing stores with null owner_id)
        const savedSlug = localStorage.getItem(STORE_SLUG_KEY);
        if (savedSlug) {
          try {
            const s = await getStore(savedSlug);
            if (!cancelled) setStore(s);
          } catch {
            localStorage.removeItem(STORE_ID_KEY);
            localStorage.removeItem(STORE_SLUG_KEY);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load store");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const refreshStore = async () => {
    if (user) {
      try {
        const s = await getStoreByOwnerId(user.uid);
        setStore(s);
        return;
      } catch {}
    }
    const slug = localStorage.getItem(STORE_SLUG_KEY);
    if (!slug) return;
    try {
      const s = await getStore(slug);
      setStore(s);
    } catch {}
  };

  return { store, loading: loading || authLoading, error, refreshStore, setStore };
}
