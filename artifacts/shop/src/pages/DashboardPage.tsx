import { Link } from "wouter";
import { Package, TrendingUp, ShoppingBag, Plus, Boxes, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { StatCard } from "@/components/StatCard";
import { ProductCard } from "@/components/ProductCard";
import { MOCK_PRODUCTS, MOCK_STATS } from "@/lib/mock-data";

export function DashboardPage() {
  const totalUnits = MOCK_PRODUCTS.reduce((sum, p) => sum + p.units, 0);
  const inStockCount = MOCK_PRODUCTS.filter((p) => p.units > 0).length;
  const outOfStockCount = MOCK_PRODUCTS.filter((p) => p.units === 0).length;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/10">
      <Navbar />

      <main className="flex-1 container max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your store today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Total Revenue"
            value={`₹${MOCK_STATS.revenue.toLocaleString("en-IN")}`}
            icon={<TrendingUp className="h-5 w-5" />}
            testId="stat-revenue"
          />
          <StatCard
            title="Total Orders"
            value={MOCK_STATS.totalOrders}
            icon={<ShoppingBag className="h-5 w-5" />}
            testId="stat-orders"
          />
          <StatCard
            title="Products Listed"
            value={MOCK_STATS.productCount}
            icon={<Package className="h-5 w-5" />}
            testId="stat-products"
          />
        </div>

        {/* Inventory Summary */}
        <div className="bg-card border rounded-2xl px-6 py-4 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8" data-testid="inventory-summary">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Units</p>
              <p className="text-xl font-bold text-foreground" data-testid="stat-total-units">{totalUnits}</p>
            </div>
          </div>
          <div className="hidden sm:block w-px h-10 bg-border" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">In Stock</p>
              <p className="text-xl font-bold text-green-600" data-testid="stat-in-stock">{inStockCount} products</p>
            </div>
          </div>
          <div className="hidden sm:block w-px h-10 bg-border" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-500">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Out of Stock</p>
              <p className="text-xl font-bold text-red-500" data-testid="stat-out-of-stock">{outOfStockCount} products</p>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Your Products</h2>
          <Button asChild className="rounded-full shadow-sm" data-testid="btn-add-product">
            <Link href="/add-product">
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
          {MOCK_PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
    </div>
  );
}
