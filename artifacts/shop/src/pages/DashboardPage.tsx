import { Link } from "wouter";
import { Package, TrendingUp, ShoppingBag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { StatCard } from "@/components/StatCard";
import { ProductCard } from "@/components/ProductCard";
import { MOCK_PRODUCTS, MOCK_STATS } from "@/lib/mock-data";

export function DashboardPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/10">
      <Navbar />
      
      <main className="flex-1 container max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your store today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
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
