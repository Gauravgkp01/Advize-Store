import { Link } from "wouter";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";

const FEATURES = [
  "Store builder",
  "Analytics dashboard",
  "Razorpay integration",
  "Instagram store link",
  "QR code download",
  "Product management",
  "Order dashboard",
  "Mobile optimized storefront",
];

export function PricingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 px-4 py-16 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              Simple, honest pricing
            </h1>
            <p className="text-lg text-muted-foreground">
              One plan. Everything included. No surprises.
            </p>
          </div>

          {/* Pricing card */}
          <div className="relative bg-card border-2 border-primary rounded-3xl shadow-xl overflow-hidden">
            {/* Badge */}
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-bl-2xl tracking-wide uppercase">
              First month free
            </div>

            <div className="p-8 sm:p-10">
              {/* Plan name + price */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Starter</h2>
                </div>
              </div>

              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-extrabold text-foreground">₹199</span>
                <span className="text-muted-foreground mb-2 text-lg">/month</span>
              </div>
              <p className="text-sm text-primary font-medium mb-8">Free for your first month — no credit card needed to start.</p>

              {/* CTA */}
              <Button asChild size="lg" className="w-full h-13 text-base rounded-2xl shadow-md hover:shadow-lg transition-all mb-10">
                <Link href="/signup">Get Started Free</Link>
              </Button>

              {/* Features */}
              <div className="border-t pt-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">Everything included</p>
                <ul className="space-y-3">
                  {FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Charges */}
              <div className="mt-8 border-t pt-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Charges</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-foreground">
                    <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">%</span>
                    <span>
                      <span className="font-medium">1% Advize platform fee</span> per successful order
                    </span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground">
                    <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">₹</span>
                    <span>Standard Razorpay payment processing charges apply</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground mt-8">
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
