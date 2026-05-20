import { useEffect } from "react";

/**
 * Applies the correct HTML class for a storefront page based on the store's
 * configured theme. Call this in every storefront-context page
 * (StorefrontPage, CartPage, ProductDetailPage, OrderHistoryPage).
 *
 * Defaults to dark while the store data is still loading (theme === undefined).
 * Cleans up (removes both classes) when the component unmounts so the rest of
 * the app reverts to its own theme system.
 */
export function useStorefrontTheme(theme: string | undefined) {
  useEffect(() => {
    const html = document.documentElement;
    if (theme === "light") {
      html.classList.remove("dark");
      html.classList.add("sf-light");
    } else {
      html.classList.remove("sf-light");
      html.classList.add("dark");
    }
    return () => {
      html.classList.remove("dark", "sf-light");
    };
  }, [theme]);
}
