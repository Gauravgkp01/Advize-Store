import { Link } from "wouter";
import { Check, Zap, Star, Puzzle } from "lucide-react";
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

const CHARGES = [
  { icon: "%", text: "1% Advize platform fee per successful order" },
  { icon: "₹", text: "Standard Razorpay payment processing charges apply" },
];

function FeatureItem({ text, muted = false }: { text: string; muted?: boolean }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <span className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${muted ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground"}`}>
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{text}</span>
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              Simple, honest pricing
            </h1>
            <p className="text-lg text-muted-foreground">
              Start free. Scale when you're ready.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid md:grid-cols-2 gap-6 items-start">

            {/* ── Starter ── */}
            <div className="relative bg-card border-2 border-border rounded-3xl shadow-md overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-bl-2xl tracking-wide uppercase">
                First month free
              </div>

              <div className="p-8">
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
                <p className="text-sm text-primary font-medium mb-7">Free for your first month — no credit card needed.</p>

                <Button asChild size="lg" variant="outline" className="w-full rounded-2xl mb-8">
                  <Link href="/signup">Get Started Free</Link>
                </Button>

                <div className="border-t pt-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Includes</p>
                  <ul className="space-y-3">
                    {STARTER_FEATURES.map((f) => <FeatureItem key={f} text={f} muted />)}
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

              <div className="p-8">
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
                <p className="text-sm text-primary font-medium mb-7">Everything in Starter, plus powerful Instagram tools.</p>

                <Button asChild size="lg" className="w-full rounded-2xl shadow-md hover:shadow-lg transition-all mb-8">
                  <Link href="/signup">Get Started Free</Link>
                </Button>

                {/* Pro-only features */}
                <div className="border-t pt-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Pro features</p>
                  <ul className="space-y-3">
                    {PRO_EXTRAS.map((f) => <FeatureItem key={f} text={f} />)}
                  </ul>
                </div>

                {/* Plugin note */}
                <div className="mt-5 flex items-start gap-3 bg-muted/50 rounded-2xl px-4 py-3">
                  <Puzzle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Plugin marketplace access is included. Individual plugins may carry their own usage charges.
                  </p>
                </div>

                {/* Starter features included */}
                <div className="mt-6 border-t pt-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">All Starter features included</p>
                  <ul className="space-y-3">
                    {STARTER_FEATURES.map((f) => <FeatureItem key={f} text={f} muted />)}
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
