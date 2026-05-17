import { Link } from "wouter";
import {
  ArrowRight, Store, Share2, MessageCircle, LogIn, UserPlus, Tag,
  Zap, ShieldCheck, TrendingUp, Gift, Truck, CreditCard, Instagram,
  Star, CheckCircle, ChevronRight, Smartphone, Package, Bell, Ticket,
  Heart, BarChart2, QrCode, Repeat, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";

/* ── tiny helpers ───────────────────────────────────────── */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center mb-4">
      <Badge>{children}</Badge>
    </div>
  );
}

function FeatureCard({
  icon, title, desc, accent = "primary",
}: { icon: React.ReactNode; title: string; desc: string; accent?: string }) {
  const bg: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    green:   "bg-green-500/10 text-green-500",
    purple:  "bg-purple-500/10 text-purple-500",
    orange:  "bg-orange-500/10 text-orange-500",
    blue:    "bg-blue-500/10 text-blue-500",
    pink:    "bg-pink-500/10 text-pink-500",
    yellow:  "bg-yellow-500/10 text-yellow-500",
  };
  return (
    <div className="bg-card rounded-2xl border p-6 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg[accent] ?? bg.primary}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-base mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center shadow-lg shadow-primary/30">
        {n}
      </div>
      <div className="pt-1.5">
        <h3 className="font-bold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function PluginCard({
  icon, name, tag, desc, points,
}: { icon: React.ReactNode; name: string; tag: string; desc: string; points: string[] }) {
  return (
    <div className="bg-card rounded-2xl border p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h3 className="font-bold">{name}</h3>
          <span className="text-xs text-primary font-medium">{tag}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{desc}</p>
      <ul className="space-y-1.5">
        {points.map(p => (
          <li key={p} className="flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── main component ─────────────────────────────────────── */
export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">

        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="relative px-4 pt-20 pb-24 sm:px-6 lg:pt-32 lg:pb-36 flex flex-col items-center text-center overflow-hidden">
          {/* glow */}
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
            <div className="w-[600px] h-[400px] rounded-full bg-primary/10 blur-[100px] -translate-y-1/4" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-muted/50 text-muted-foreground mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
              Built for first-time sellers
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6">
              Start Selling in{" "}
              <span className="text-primary relative whitespace-nowrap">
                <span className="relative z-10">5 Minutes</span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/40" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="transparent" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              No website, no coding, no complexity. A beautiful storefront that connects directly to your WhatsApp — with Instagram automation, loyalty programs, and more.
            </p>

            {user ? (
              <Button asChild size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all">
                <Link href="/dashboard">Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button asChild size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all w-full sm:w-auto">
                  <Link href="/signup"><UserPlus className="mr-2 h-5 w-5" />Get Started Free</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full w-full sm:w-auto">
                  <Link href="/login"><LogIn className="mr-2 h-5 w-5" />Sign In</Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="h-14 px-8 text-lg rounded-full w-full sm:w-auto">
                  <Link href="/pricing"><Tag className="mr-2 h-5 w-5" />Pricing</Link>
                </Button>
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">100% free to set up. No credit card required.</p>

            {/* stats bar */}
            <div className="mt-14 grid grid-cols-3 gap-4 max-w-lg mx-auto">
              {[
                { n: "5 min", label: "Setup time" },
                { n: "0₹", label: "To get started" },
                { n: "WhatsApp", label: "Order channel" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl border bg-card/50 py-4 px-2 min-w-0">
                  <div className="text-base sm:text-xl font-extrabold text-primary leading-tight break-words">{s.n}</div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DEMO STORE CTA ────────────────────────────────── */}
        <section className="px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl border bg-gradient-to-r from-primary/10 via-card to-green-500/10 p-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Live Demo</p>
                <h2 className="text-2xl font-extrabold mb-2">See a real store in action</h2>
                <p className="text-muted-foreground text-sm">Browse a live Advize store — add products to cart, share items, experience the WhatsApp checkout flow firsthand.</p>
              </div>
              <a
                href="https://store.advize.in/store/12345-ssf3o"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Button size="lg" className="h-12 px-6 rounded-full gap-2">
                  <Store className="h-5 w-5" />
                  View Demo Store
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ─────────────────────────────────── */}
        <section className="px-4 py-20 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <SectionLabel>Features</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">Everything in one place</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">All the tools a small business needs — no expensive subscriptions, no technical setup.</p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FeatureCard icon={<Smartphone className="h-6 w-6" />} title="Mobile-First Storefront" desc="Your store looks stunning on every phone. Customers can browse, share, and order in seconds." accent="primary" />
              <FeatureCard icon={<MessageCircle className="h-6 w-6" />} title="WhatsApp Orders" desc="Every order arrives directly in your WhatsApp — no app, no middleware, no missed messages." accent="green" />
              <FeatureCard icon={<Package className="h-6 w-6" />} title="Product Management" desc="Add unlimited products with images, categories, stock levels, and sale pricing." accent="blue" />
              <FeatureCard icon={<BarChart2 className="h-6 w-6" />} title="Sales Analytics" desc="Track views, orders, and revenue with a simple dashboard built for non-technical sellers." accent="purple" />
              <FeatureCard icon={<Share2 className="h-6 w-6" />} title="Social Sharing" desc="Products are Pinterest, WhatsApp and Instagram preview-ready with full Open Graph support." accent="pink" />
              <FeatureCard icon={<QrCode className="h-6 w-6" />} title="QR Code & Link" desc="Get a shareable link and QR code for your store — print it on flyers, invoices, and packaging." accent="orange" />
              <FeatureCard icon={<TrendingUp className="h-6 w-6" />} title="Trending Products" desc="Pin your best-sellers to the top of your store to drive more sales automatically." accent="yellow" />
              <FeatureCard icon={<Bell className="h-6 w-6" />} title="Order Notifications" desc="Get instant alerts every time a new order comes in — never miss a sale." accent="green" />
              <FeatureCard icon={<Zap className="h-6 w-6" />} title="Instant Go-Live" desc="No approval process. Your store is live the moment you finish setting up." accent="primary" />
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────── */}
        <section className="px-4 py-20 sm:px-6 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">From zero to selling in 4 steps</h2>
            <p className="text-muted-foreground text-center mb-14 max-w-xl mx-auto">No technical knowledge needed. If you can use WhatsApp, you can run an Advize store.</p>

            <div className="grid sm:grid-cols-2 gap-x-16 gap-y-10">
              <Step n={1} title="Create your free account" desc="Sign up with your email in under a minute. No credit card, no verification delays." />
              <Step n={2} title="Set up your store" desc="Add your store name, logo, and WhatsApp number. Takes about 2 minutes." />
              <Step n={3} title="Add your products" desc="Upload product photos, set prices, and add descriptions. List as many as you want." />
              <Step n={4} title="Share and start selling" desc="Copy your store link and share it on Instagram, WhatsApp, Facebook — anywhere. Orders land in your WhatsApp instantly." />
            </div>

            <div className="mt-14 text-center">
              <Button asChild size="lg" className="h-12 px-8 rounded-full shadow-lg shadow-primary/30">
                <Link href="/signup">Create Your Store Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── PLUGINS ───────────────────────────────────────── */}
        <section className="px-4 py-20 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <SectionLabel>Plugins</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">Supercharge your store</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">One-click plugins that connect your store to the platforms your customers already use.</p>

            <div className="grid sm:grid-cols-3 gap-5">
              <PluginCard
                icon={<svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#E1306C]"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>}
                name="Instagram Auto DM"
                tag="Automation Plugin"
                desc="Automatically reply to Instagram comments with a personalised DM containing your store link — turn every comment into a customer."
                points={[
                  "Keyword-triggered auto replies",
                  "Send store or product links automatically",
                  "Works 24 × 7 while you sleep",
                  "Custom reply messages per rule",
                ]}
              />
              <PluginCard
                icon={<svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#E60023]"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" /></svg>}
                name="Pinterest Integration"
                tag="Social Commerce"
                desc="Every product page is Pinterest-ready with full Product Rich Pin support — title, price, availability, and image all appear in pins automatically."
                points={[
                  "Automatic Product Rich Pin meta tags",
                  "og:type=product with price & availability",
                  "JPEG-optimised images for Pinterest crawler",
                  "Works out of the box — zero configuration",
                ]}
              />
              <PluginCard
                icon={<svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>}
                name="WhatsApp Automation"
                tag="Coming Soon"
                desc="Let customers browse, add to cart, and send their complete order summary directly to your WhatsApp with a single tap."
                points={[
                  "Pre-filled order message with all product details",
                  "Customer name & phone auto-captured",
                  "Order confirmation with total & items",
                  "Works on all phones without any app",
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── LOYALTY & VOUCHERS ────────────────────────────── */}
        <section className="px-4 py-20 sm:px-6 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <SectionLabel>Retention Tools</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">Keep customers coming back</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">Built-in tools to reward loyal customers and drive repeat purchases — no third-party apps needed.</p>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Loyalty */}
              <div className="bg-card rounded-2xl border p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                    <Star className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Loyalty Stamp Cards</h3>
                    <span className="text-xs text-primary font-medium">Built-in</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Give customers a stamp for every purchase. When they collect enough stamps, they earn a reward — automatically applied at checkout.</p>
                <ul className="space-y-2">
                  {[
                    "Custom stamp goal (e.g. 5 stamps = free item)",
                    "Automatic reward notification via WhatsApp",
                    "Customers see their progress in the store",
                    "No app download required for customers",
                  ].map(p => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Vouchers / Coupons */}
              <div className="bg-card rounded-2xl border p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                    <Ticket className="h-6 w-6 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Coupon & Voucher Codes</h3>
                    <span className="text-xs text-primary font-medium">Built-in</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Create discount codes in seconds — fixed amount off, percentage discount, or free delivery. Share them anywhere, set expiry dates and usage limits.</p>
                <ul className="space-y-2">
                  {[
                    "Flat ₹ or % discount codes",
                    "Usage limits and expiry dates",
                    "Applied automatically at checkout",
                    "Track redemptions in your dashboard",
                  ].map(p => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── PAYMENTS ──────────────────────────────────────── */}
        <section className="px-4 py-20 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <SectionLabel>Payments</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">Accept online payments instantly</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">Connect Razorpay in minutes and start accepting UPI, cards, net banking, and wallets directly from your store.</p>

            <div className="grid sm:grid-cols-3 gap-5">
              {[
                {
                  icon: <CreditCard className="h-6 w-6 text-blue-500" />,
                  bg: "bg-blue-500/10",
                  title: "All payment methods",
                  desc: "UPI, credit/debit cards, net banking, Paytm, PhonePe, Google Pay — everything under one gateway.",
                },
                {
                  icon: <ShieldCheck className="h-6 w-6 text-green-500" />,
                  bg: "bg-green-500/10",
                  title: "Secure & PCI Compliant",
                  desc: "Powered by Razorpay — trusted by 8 million+ businesses across India. Your customers' payments are always safe.",
                },
                {
                  icon: <Repeat className="h-6 w-6 text-purple-500" />,
                  bg: "bg-purple-500/10",
                  title: "Instant settlements",
                  desc: "Money reaches your bank account in T+2 days. Track every payment and refund from your dashboard.",
                },
              ].map(c => (
                <div key={c.title} className="bg-card rounded-2xl border p-6">
                  <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center mb-4`}>{c.icon}</div>
                  <h3 className="font-bold mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border bg-muted/30 p-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold mb-1">Powered by Razorpay</p>
                <p className="text-sm text-muted-foreground">India's most trusted payment gateway — used by Swiggy, Zomato, IRCTC, and millions of small businesses.</p>
              </div>
              <Button asChild variant="outline" className="rounded-full shrink-0">
                <Link href="/dashboard">Connect Razorpay <ChevronRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── DELIVERY ──────────────────────────────────────── */}
        <section className="px-4 py-20 sm:px-6 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <SectionLabel>Delivery</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">Flexible delivery options</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">Let customers choose how they receive their order — delivery, pickup, or a custom option you define.</p>

            <div className="grid sm:grid-cols-3 gap-5">
              {[
                {
                  icon: <Truck className="h-6 w-6 text-orange-500" />,
                  bg: "bg-orange-500/10",
                  title: "Home Delivery",
                  desc: "Set your own delivery fee. Customers enter their address at checkout and you arrange delivery.",
                },
                {
                  icon: <Store className="h-6 w-6 text-primary" />,
                  bg: "bg-primary/10",
                  title: "Store Pickup",
                  desc: "Offer click & collect. Customers pick up from your location — ideal for local sellers and cafés.",
                },
                {
                  icon: <Gift className="h-6 w-6 text-pink-500" />,
                  bg: "bg-pink-500/10",
                  title: "Free Delivery Zones",
                  desc: "Set a minimum order value for free delivery. Encourage larger baskets with smart thresholds.",
                },
              ].map(c => (
                <div key={c.title} className="bg-card rounded-2xl border p-6">
                  <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center mb-4`}>{c.icon}</div>
                  <h3 className="font-bold mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────── */}
        <section className="px-4 py-24 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-[400px] h-[200px] rounded-full bg-primary/15 blur-[80px]" />
              </div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">Your store is waiting</h2>
                <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">Join thousands of sellers who chose Advize to run their business. Free forever — upgrade when you're ready.</p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button asChild size="lg" className="h-14 px-10 text-lg rounded-full shadow-lg shadow-primary/30 hover:-translate-y-1 transition-all w-full sm:w-auto">
                    <Link href="/signup"><UserPlus className="mr-2 h-5 w-5" />Create Free Store</Link>
                  </Button>
                  <a href="https://store.advize.in/store/12345-ssf3o" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="h-14 px-10 text-lg rounded-full w-full">
                      <ExternalLink className="mr-2 h-5 w-5" />View Demo
                    </Button>
                  </a>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  {["No credit card", "Free forever plan", "Setup in 5 minutes", "Cancel anytime"].map(t => (
                    <span key={t} className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-primary" /> {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="border-t bg-muted/20 py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-10">
            <div>
              <div className="font-extrabold text-lg mb-2">Advize Store</div>
              <p className="text-sm text-muted-foreground">The simplest way for small businesses to sell online and on WhatsApp.</p>
            </div>
            <div>
              <p className="font-semibold mb-3 text-sm">Quick links</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
                <li><Link href="/signup" className="hover:text-foreground transition-colors">Get Started Free</Link></li>
                <li><a href="https://store.advize.in/store/12345-ssf3o" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Demo Store</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3 text-sm">Legal</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Advize Technology Private Limited. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
