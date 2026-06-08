import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getStoreByOwnerId } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle2, MessageCircle, Share2 } from "lucide-react";
import logo from "@assets/icon_1779958600802.png";

/** Fetch store with a timeout; retries once on timeout/5xx (Render cold-start). */
async function fetchStoreWithRetry(uid: string, maxAttempts = 2): Promise<{ store: Awaited<ReturnType<typeof getStoreByOwnerId>> | null; notFound: boolean }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const store = await getStoreByOwnerId(uid);
      return { store, notFound: false };
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      const is404 = msg.includes("404") || msg.toLowerCase().includes("not found");
      if (is404) return { store: null, notFound: true };
      // On last attempt, re-throw so the caller can handle it
      if (attempt === maxAttempts) throw err;
      // Otherwise wait 2 seconds and retry (server likely cold-starting)
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  // Should never reach here
  return { store: null, notFound: false };
}

export function LoginPage() {
  const [, setLocation] = useLocation();
  const { signIn } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ variant: "destructive", title: "Please fill in all fields." });
      return;
    }

    setLoading(true);
    try {
      const user = await signIn(email.trim(), password);

      let store = null;
      try {
        const result = await fetchStoreWithRetry(user.uid);
        if (result.notFound) {
          // Confirmed 404: user has no store yet
          // But double-check localStorage cache before sending to onboarding
          // (handles edge-case where store exists but owner_id lookup fails)
          const cachedSlug = localStorage.getItem("shop_store_slug");
          if (cachedSlug) {
            // A slug exists in cache → trust it and go to dashboard
            setLocation("/dashboard");
            return;
          }
          setLocation("/onboarding");
          return;
        }
        store = result.store;
      } catch (apiErr: any) {
        // All retries failed — likely server still cold-starting or CORS error
        toast({
          variant: "destructive",
          title: "Could not reach the server",
          description: "The API server may be starting up (can take ~30s on free tier). Please try again in a moment.",
        });
        setLoading(false);
        return;
      }

      if (store) {
        localStorage.setItem("shop_store_id", store.id);
        localStorage.setItem("shop_store_slug", store.slug);
        try { localStorage.setItem("shop_store_obj_v1", JSON.stringify(store)); } catch {}
        setLocation("/dashboard");
      } else {
        // Shouldn't happen but guard anyway
        setLocation("/dashboard");
      }
    } catch (e: any) {
      const msg = e.code === "auth/invalid-credential"
        ? "Incorrect email or password."
        : e.message ?? "Login failed. Please try again.";
      toast({ variant: "destructive", title: "Login failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const FEATURES = [
    { icon: CheckCircle2,  text: "Set up your store in minutes" },
    { icon: Share2,        text: "Share your link on social media" },
    { icon: MessageCircle, text: "Orders direct to your WhatsApp" },
  ];

  return (
    <div className="min-h-[100dvh] flex bg-background">

      {/* ── Left brand panel (desktop only) ─────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-primary/5 border-r flex-col items-center justify-center p-12">
        <div className="max-w-sm w-full">
          <Link href="/" className="flex items-center gap-3 mb-10">
            <img src={logo} alt="Advize" className="h-10 w-10 object-contain" />
            <span className="text-xl font-bold">Advize Store</span>
          </Link>
          <h2 className="text-3xl font-bold mb-3 leading-tight">Your store, your rules</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Manage products, track orders, and connect with customers — all from one simple dashboard.
          </p>
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-muted/10 lg:bg-background">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4 lg:hidden">
              <img src={logo} alt="Advize" className="h-12 w-12 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-1 text-sm">Sign in to your store</p>
          </div>

          <div className="bg-card p-6 rounded-3xl border shadow-sm">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-11 rounded-xl"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 rounded-xl pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground mt-5">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
