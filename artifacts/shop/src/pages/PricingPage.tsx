import { Link } from "wouter";
import { Check, Zap, Star, Puzzle, Globe, TrendingUp, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";

const STARTER_FEATURES = [
  "Store builder",
  "Analytics dashboard",
  "Razorpay integration",
  "Instagram store link",
  "QR code download",
  "Product management",
  "Order dashboard",
  "Mobile optimized storefront",
];

const PRO_EXTRAS = [
  "Instagram DM automation",
  "Instagram catalog sync",
  "Loyalty card program",
  "Coupon & discount codes",
  "Plugin marketplace access",
];

const BUSINESS_EXTRAS = [
  "Custom domain",
  "Competitor Instagram analytics",
  "Market demand & trend research",
  "Priority support",
];

const CHARGES = [
  { icon: "%", text: "1% Advize platform fee per successful order" },
  { icon: "₹", text: "Standard Razorpay payment processing charges apply" },
];

function FeatureItem({ text, highlight = false }: { text: string; highlight?: boolean }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <span className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      <span className={highlight ? "text-foreground font-medium" : "text-muted-foreground"}>{text}</span>
    </li>
  );
}

function ChargeItem({ icon, text }: { icon: string; text: string }) {
  return (
    <li className="flex items-start gap-3 text-sm text-foreground">
      <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">
        {icon}
      </span>
      <span>{text}</span>
    </li>
  );
}

export function PricingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 px-4 py-16 sm:px-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              Simple, honest pricing
            </h1>
            <p className="text-lg text-muted-foreground">
              Start free. Scale when you're ready.
            </p>
          </div>

          {/* Cards grid — 1 col → 2 col → 3 col */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">

            {/* ── Starter ── */}
            <div className="relative bg-card border-2 border-border rounded-3xl shadow-md overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-bl-2xl tracking-wide uppercase">
                First month free
              </div>

              <div className="p-7">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Starter</h2>
                </div>

                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-extrabold text-foreground">₹199</span>
                  <span className="text-muted-foreground mb-2 text-lg">/month</span>
                </div>
                <p className="text-sm text-primary font-medium mb-6">Free for your first month — no credit card needed.</p>

                <Button asChild size="lg" variant="outline" className="w-full rounded-2xl mb-7">
                  <Link href="/signup">Get Started Free</Link>
                </Button>

                <div className="border-t pt-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Includes</p>
                  <ul className="space-y-3">
                    {STARTER_FEATURES.map((f) => <FeatureItem key={f} text={f} />)}
                  </ul>
                </div>

                <div className="mt-6 border-t pt-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Charges</p>
                  <ul className="space-y-3">
                    {CHARGES.map((c) => <ChargeItem key={c.icon} {...c} />)}
                  </ul>
                </div>
              </div>
            </div>

            {/* ── Pro ── */}
            <div className="relative bg-card border-2 border-primary rounded-3xl shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-bl-2xl tracking-wide uppercase">
                Best for Instagram
              </div>

              <div className="p-7">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                    <Star className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Pro</h2>
                </div>

                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-extrabold text-foreground">₹499</span>
                  <span className="text-muted-foreground mb-2 text-lg">/month</span>
                </div>
                <p className="text-sm text-primary font-medium mb-6">Everything in Starter, plus powerful Instagram tools.</p>

                <Button asChild size="lg" className="w-full rounded-2xl shadow-md hover:shadow-lg transition-all mb-7">
                  <Link href="/signup">Get Started Free</Link>
                </Button>

                <div className="border-t pt-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Pro features</p>
                  <ul className="space-y-3">
                    {PRO_EXTRAS.map((f) => <FeatureItem key={f} text={f} highlight />)}
                  </ul>
                </div>

                <div className="mt-5 flex items-start gap-3 bg-muted/50 rounded-2xl px-4 py-3">
                  <Puzzle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Plugin marketplace included. Individual plugins may carry their own usage charges.
                  </p>
                </div>

                <div className="mt-6 border-t pt-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">All Starter features</p>
                  <ul className="space-y-3">
                    {STARTER_FEATURES.map((f) => <FeatureItem key={f} text={f} />)}
                  </ul>
                </div>

                <div className="mt-6 border-t pt-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Charges</p>
                  <ul className="space-y-3">
                    {CHARGES.map((c) => <ChargeItem key={c.icon} {...c} />)}
                  </ul>
                </div>
              </div>
            </div>

            {/* ── Business ── */}
            <div className="relative bg-card border-2 border-border rounded-3xl shadow-md overflow-hidden md:col-span-2 lg:col-span-1">
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-semibold px-4 py-1.5 rounded-bl-2xl tracking-wide uppercase">
                Full power
              </div>

              <div className="p-7">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Business</h2>
                </div>

                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-extrabold text-foreground">₹999</span>
                  <span className="text-muted-foreground mb-2 text-lg">/month</span>
                </div>
                <p className="text-sm text-amber-500 font-medium mb-6">Everything in Pro, plus insights and dedicated support.</p>

                <Button asChild size="lg" className="w-full rounded-2xl mb-7 bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg transition-all">
                  <Link href="/signup">Get Started Free</Link>
                </Button>

                {/* Business-only */}
                <div className="border-t pt-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Business features</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                        <Globe className="h-3 w-3" />
                      </span>
                      <span className="text-foreground font-medium">Custom domain</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                        <TrendingUp className="h-3 w-3" />
                      </span>
                      <span className="text-foreground font-medium">Competitor Instagram analytics & research</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                        <TrendingUp className="h-3 w-3" />
                      </span>
                      <span className="text-foreground font-medium">Market demand & trend insights</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                        <Headphones className="h-3 w-3" />
                      </span>
                      <span className="text-foreground font-medium">Priority support</span>
                    </li>
                  </ul>
                </div>

                {/* Pro features included */}
                <div className="mt-6 border-t pt-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">All Pro features</p>
                  <ul className="space-y-3">
                    {PRO_EXTRAS.map((f) => <FeatureItem key={f} text={f} />)}
                  </ul>
                </div>

                {/* Starter features included */}
                <div className="mt-6 border-t pt-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">All Starter features</p>
                  <ul className="space-y-3">
                    {STARTER_FEATURES.map((f) => <FeatureItem key={f} text={f} />)}
                  </ul>
                </div>

                <div className="mt-6 border-t pt-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Charges</p>
                  <ul className="space-y-3">
                    {CHARGES.map((c) => <ChargeItem key={c.icon} {...c} />)}
                  </ul>
                </div>
              </div>
            </div>

          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground mt-10">
            Have questions?{" "}
            <a href="mailto:hello@advize.in" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Contact us
            </a>
          </p>
        </div>
      </main>

      <footer className="bg-background py-8 border-t text-center text-muted-foreground">
        <p>© {new Date().getFullYear()} Advize Technology Private Limited. All rights reserved.</p>
        <p className="mt-2 text-xs">
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Terms and Conditions
          </Link>
        </p>
      </footer>
    </div>
  );
}
