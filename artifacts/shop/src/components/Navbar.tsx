import { Link } from "wouter";
import { Store, Menu, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group" data-testid="link-home">
          <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary/20 transition-colors">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">Advize Store</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-dashboard">
            Dashboard
          </Link>
          <Link href="/store/priya-boutique" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-store">
            My Store
          </Link>
          <Button asChild className="rounded-full px-6 shadow-sm" data-testid="btn-nav-create">
            <Link href="/onboarding">Create Store</Link>
          </Button>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="btn-mobile-menu">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
              <DropdownMenuItem asChild className="rounded-lg mb-1 cursor-pointer">
                <Link href="/dashboard" className="flex items-center w-full">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg mb-1 cursor-pointer">
                <Link href="/store/priya-boutique" className="flex items-center w-full">
                  <Store className="mr-2 h-4 w-4" />
                  <span>My Store</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg cursor-pointer bg-primary/10 text-primary focus:bg-primary/20 focus:text-primary">
                <Link href="/onboarding" className="flex items-center w-full font-medium">
                  Create Store
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
