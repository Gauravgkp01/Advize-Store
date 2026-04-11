import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { LandingPage } from "@/pages/LandingPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AddProductPage } from "@/pages/AddProductPage";
import { StorefrontPage } from "@/pages/StorefrontPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";

const queryClient = new QueryClient();

const SCROLL_EXPIRY_MS = 60_000;

function ScrollRestorer() {
  const [location] = useLocation();
  const prevLocation = useRef<string | null>(null);

  useEffect(() => {
    if (prevLocation.current !== null && prevLocation.current !== location) {
      sessionStorage.setItem(
        `scroll:${prevLocation.current}`,
        JSON.stringify({ y: window.scrollY, t: Date.now() })
      );
    }

    const saved = sessionStorage.getItem(`scroll:${location}`);
    if (saved) {
      const { y, t } = JSON.parse(saved) as { y: number; t: number };
      if (Date.now() - t < SCROLL_EXPIRY_MS) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }))
        );
      } else {
        sessionStorage.removeItem(`scroll:${location}`);
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    prevLocation.current = location;
  }, [location]);

  return null;
}

function Router() {
  return (
    <>
      <ScrollRestorer />
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/add-product" component={AddProductPage} />
        <Route path="/store/:slug" component={StorefrontPage} />
        <Route path="/product/:id" component={ProductDetailPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
