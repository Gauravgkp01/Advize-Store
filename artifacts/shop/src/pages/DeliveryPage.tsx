import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Bike, CheckCircle2, ExternalLink, Loader2, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = `${import.meta.env.BASE_URL}api`;

export function DeliveryPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const storeId = localStorage.getItem("shop_store_id") ?? "";

  const [pickupLocation, setPickupLocation] = useState(
    localStorage.getItem("shiprocket_pickup_location") ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);

  // Test Shiprocket connectivity via a lightweight track call
  const testConnection = async () => {
    setTesting(true);
    setConnected(null);
    try {
      const token = await user?.getIdToken();
      // We ping the track endpoint with a dummy ID — a 4xx from Shiprocket (not a network error)
      // means auth worked. A 502 means our credentials are wrong.
      const res = await fetch(`${API_BASE}/delivery/track?shipmentId=test-ping`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // Shiprocket returns 200/4xx for bad shipment IDs but still authenticates OK
      setConnected(res.status !== 502);
    } catch {
      setConnected(false);
    } finally {
      setTesting(false);
    }
  };

  const savePickupLocation = () => {
    const val = pickupLocation.trim();
    if (!val) {
      toast({ variant: "destructive", title: "Pickup location name is required" });
      return;
    }
    setSaving(true);
    localStorage.setItem("shiprocket_pickup_location", val);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Saved!", description: "Default pickup location updated." });
    }, 400);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/10">
      <Navbar />
      <main className="flex-1 container max-w-2xl mx-auto px-4 sm:px-6 py-8">

        <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
          onClick={() => setLocation("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <div className="bg-green-50 dark:bg-green-950/40 p-3 rounded-xl">
            <Bike className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Delivery Partners</h1>
            <p className="text-sm text-muted-foreground">Manage your shipping integrations</p>
          </div>
        </div>

        {/* Shiprocket card */}
        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden mb-6">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center font-black text-orange-500 text-sm tracking-tight">
                SR
              </div>
              <div>
                <p className="font-semibold text-foreground leading-tight">Shiprocket</p>
                <p className="text-xs text-muted-foreground">Pan-India courier aggregator</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connected === true && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-950/40 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                </span>
              )}
              {connected === false && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/10 px-2.5 py-1 rounded-full">
                  Auth failed
                </span>
              )}
              <Button variant="outline" size="sm" className="rounded-xl text-xs h-8"
                onClick={testConnection} disabled={testing}>
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test connection"}
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">

            {/* Credentials info */}
            <div className="flex gap-3 bg-muted/40 rounded-xl p-4">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your Shiprocket credentials (email &amp; password) are already stored securely as environment secrets.
                Use "Test connection" to verify they are working correctly.
              </p>
            </div>

            {/* Pickup location */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Default Pickup Location Name</label>
              <Input
                value={pickupLocation}
                onChange={e => setPickupLocation(e.target.value)}
                placeholder="e.g. Primary Warehouse"
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                This must exactly match the pickup address name you've set up in your{" "}
                <a
                  href="https://app.shiprocket.in/seller/settings/pickup-address"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5">
                  Shiprocket dashboard <ExternalLink className="h-3 w-3" />
                </a>.
                It will be used as the default when creating shipments.
              </p>
            </div>

            <Button onClick={savePickupLocation} disabled={saving} className="w-full h-11 rounded-xl">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-card border rounded-2xl shadow-sm px-6 py-5 space-y-4">
          <p className="font-semibold text-sm">How shipment creation works</p>
          <ol className="space-y-3">
            {[
              "A customer places an order and pays.",
              "You open the order in your dashboard and click \u201cCreate Shipment\u201d.",
              "Shiprocket picks the best courier and generates an AWB tracking number.",
              "The tracking number is saved to the order and you can share it with the customer.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

      </main>
    </div>
  );
}
