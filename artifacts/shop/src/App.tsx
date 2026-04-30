import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";

import { LandingPage } from "@/pages/LandingPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AddProductPage } from "@/pages/AddProductPage";
import { EditProductPage } from "@/pages/EditProductPage";
import { StorefrontPage } from "@/pages/StorefrontPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { TermsPage } from "@/pages/TermsPage";
import { CartPage } from "@/pages/CartPage";
import { CartProvider } from "@/contexts/CartContext";

const queryClient = new QueryClient();

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/onboarding">
          <ProtectedRoute><OnboardingPage /></ProtectedRoute>
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        </Route>
        <Route path="/add-product">
          <ProtectedRoute><AddProductPage /></ProtectedRoute>
        </Route>
        <Route path="/edit-product/:id">
          <ProtectedRoute><EditProductPage /></ProtectedRoute>
        </Route>
        <Route path="/store/:slug" component={StorefrontPage} />
        <Route path="/store/:slug/cart" component={CartPage} />
        <Route path="/product/:id" component={ProductDetailPage} />
        <Route path="/terms" component={TermsPage} />
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
          <AuthProvider>
            <CartProvider>
              <Router />
            </CartProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
