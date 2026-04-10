import { Link } from "wouter";
import { Package, TrendingUp, ShoppingBag, Plus, Boxes, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { MOCK_PRODUCTS, MOCK_STATS } from "@/lib/mock-data";

function MiniStat({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex-1 bg-card border rounded-2xl px-3 py-3 sm:px-5 sm:py-4 flex flex-col gap-1 min-w-0">
      <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <p className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-tight mt-1">{label}</p>
      <p className="text-base sm:text-xl font-bold text-foreground leading-tight truncate">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const totalUnits = MOCK_PRODUCTS.reduce((sum, p) => sum + p.units, 0);
  const inStockCount = MOCK_PRODUCTS.filter((p) => p.units > 0).length;
  const outOfStockCount = MOCK_PRODUCTS.filter((p) => p.units === 0).length;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/10">
      <Navbar />

      <main className="flex-1 container max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-8">

        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-foreground">Welcome back!</h1>
            <p className="text-muted-foreground text-xs sm:text-base mt-0.5">Here's your store at a glance.</p>
          </div>
          <Button asChild size="sm" className="rounded-full shadow-sm text-xs sm:text-sm" data-testid="btn-add-product">
            <Link href="/add-product">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
            </Link>
          </Button>
        </div>

        {/* Stats row — 3 on mobile, 5 on desktop */}
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 no-scrollbar">
          <MiniStat
            icon={<TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            label="Revenue"
            value={`₹${MOCK_STATS.revenue.toLocaleString("en-IN")}`}
            color="bg-violet-100 text-violet-600"
          />
          <MiniStat
            icon={<ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            label="Orders"
            value={MOCK_STATS.totalOrders}
            color="bg-sky-100 text-sky-600"
          />
          <MiniStat
            icon={<Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            label="Products"
            value={MOCK_STATS.productCount}
            color="bg-amber-100 text-amber-600"
          />
          <MiniStat
            icon={<Boxes className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            label="Total Units"
            value={totalUnits}
            color="bg-primary/10 text-primary"
          />
        </div>

        {/* Inventory strip */}
        <div
          className="bg-card border rounded-2xl px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar"
          data-testid="inventory-summary"
        >
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <div>
              <p className="text-[10px] text-muted-foreground font-medium leading-none mb-0.5">In Stock</p>
              <p className="text-sm sm:text-base font-bold text-green-600 leading-none" data-testid="stat-in-stock">
                {inStockCount} products
              </p>
            </div>
          </div>

          <div className="w-px h-8 bg-border shrink-0" />

          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div>
              <p className="text-[10px] text-muted-foreground font-medium leading-none mb-0.5">Out of Stock</p>
              <p className="text-sm sm:text-base font-bold text-red-500 leading-none" data-testid="stat-out-of-stock">
                {outOfStockCount} products
              </p>
            </div>
          </div>

          <div className="w-px h-8 bg-border shrink-0" />

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex-1 h-2 w-28 sm:w-40 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${(inStockCount / MOCK_PRODUCTS.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
              {Math.round((inStockCount / MOCK_PRODUCTS.length) * 100)}% in stock
            </span>
          </div>

          <div className="ml-auto shrink-0">
            <Button asChild variant="outline" size="sm" className="rounded-full text-xs h-8">
              <Link href={`/store/priya-boutique`}>
                <Store className="h-3 w-3 mr-1.5" />
                My Store
              </Link>
            </Button>
          </div>
        </div>

        {/* Analytics */}
        <AnalyticsSection />

        {/* Products */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <h2 className="text-base sm:text-2xl font-bold text-foreground">Your Products</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
              {MOCK_PRODUCTS.length} listed
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5 pb-20">
            {MOCK_PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} showActions={true} />
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
