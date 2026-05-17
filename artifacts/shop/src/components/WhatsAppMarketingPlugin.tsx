import { useState, useEffect } from "react";
import {
  ChevronDown, Plus, Loader2, Trash2, Pencil, Send, Users,
  BarChart3, MessageSquare, Settings, CheckCircle2, XCircle,
  Clock, Megaphone, X, Zap, RefreshCw, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  getWAConfig, waEmbeddedSignup, disconnectWA, testWA,
  getWACampaigns, createWACampaign, deleteWACampaign, sendWACampaign,
  getWATemplates, createWATemplate, updateWATemplate, deleteWATemplate,
  getWAContacts, getWAAnalytics,
  type Store, type WaCampaign, type WaTemplate, type WaContact,
  type WaAnalytics, type WaTestResult,
} from "@/lib/api";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit?: () => void;
  }
}

function loadFBSDK(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      window.FB.init({ appId, cookie: true, xfbml: true, version: "v21.0" });
      resolve();
      return;
    }
    window.fbAsyncInit = () => {
      window.FB.init({ appId, cookie: true, xfbml: true, version: "v21.0" });
      resolve();
    };
    if (document.getElementById("facebook-jssdk")) return;
    const s = document.createElement("script");
    s.id = "facebook-jssdk";
    s.src = "https://connect.facebook.net/en_US/sdk.js";
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Facebook SDK"));
    document.head.appendChild(s);
  });
}

// ── WhatsApp Icon ─────────────────────────────────────────────────────────────
function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.38 1.26 4.8L2.05 22l5.39-1.41c1.37.73 2.93 1.15 4.6 1.15 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.52 14.12c-.23.65-1.36 1.28-1.86 1.36-.48.08-1.07.11-1.72-.11-.4-.13-.91-.31-1.56-.61-2.75-1.18-4.54-3.94-4.68-4.13-.14-.18-1.11-1.47-1.11-2.81s.7-2 .95-2.27c.25-.27.54-.34.72-.34l.52.01c.17.01.39-.07.61.46.23.54.78 1.9.85 2.04.07.14.11.3.02.48-.09.18-.14.29-.27.45-.13.16-.28.36-.4.48-.13.13-.27.28-.12.54.15.27.67 1.1 1.43 1.78.99.88 1.82 1.15 2.08 1.28.27.13.42.11.58-.06.16-.17.67-.78.85-1.05.18-.27.36-.23.6-.14.24.09 1.54.73 1.8.86.27.13.45.2.52.3.07.1.07.57-.16 1.22z"/>
    </svg>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-muted text-muted-foreground" },
  scheduled: { label: "Scheduled", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  sending:   { label: "Sending…",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  sent:      { label: "Sent",      cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
  failed:    { label: "Failed",    cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: "All subscribers",
  buyers: "Previous buyers",
  new: "New this week",
};

const CAT_LABELS: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utility",
  AUTHENTICATION: "Auth",
};

function fmt(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Main plugin component ─────────────────────────────────────────────────────
type Tab = "overview" | "campaigns" | "templates" | "contacts" | "settings";

export function WhatsAppMarketingPlugin({
  store,
  onStoreChange,
}: {
  store: Store | null;
  onStoreChange: (s: Store) => void;
}) {
  const { toast } = useToast();
  const connected = !!(store?.wa_phone_number_id);

  const [open, setOpen]     = useState(false);
  const [tab, setTab]       = useState<Tab>("overview");

  // ── connection state ──
  const [esLoading, setEsLoading]     = useState(false);
  const [esError, setEsError]         = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [testing, setTesting]         = useState(false);
  const [testResult, setTestResult]   = useState<WaTestResult | null>(null);

  // ── data ──
  const [analytics, setAnalytics]   = useState<WaAnalytics | null>(null);
  const [campaigns, setCampaigns]   = useState<WaCampaign[]>([]);
  const [templates, setTemplates]   = useState<WaTemplate[]>([]);
  const [contacts, setContacts]     = useState<WaContact[]>([]);

  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingContacts, setLoadingContacts]   = useState(false);

  // ── campaign form ──
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [cName, setCName]       = useState("");
  const [cMsg, setCMsg]         = useState("");
  const [cAudience, setCAudience] = useState("all");
  const [cSchedule, setCSchedule] = useState("");
  const [savingCampaign, setSavingCampaign]     = useState(false);
  const [sendingId, setSendingId]               = useState<string | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);

  // ── template form ──
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTpl, setEditingTpl]   = useState<WaTemplate | null>(null);
  const [tName, setTName]             = useState("");
  const [tBody, setTBody]             = useState("");
  const [tCat, setTCat]               = useState("MARKETING");
  const [savingTemplate, setSavingTemplate]     = useState(false);
  const [deletingTplId, setDeletingTplId]       = useState<string | null>(null);

  // ── contact filter ──
  const [contactFilter, setContactFilter] = useState<"all" | "buyers" | "new">("all");

  // ── lazy load per tab ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !connected || !store?.id) return;
    if (tab === "overview" && !analytics && !loadingAnalytics) {
      setLoadingAnalytics(true);
      getWAAnalytics(store.id)
        .then(setAnalytics).catch(() => {})
        .finally(() => setLoadingAnalytics(false));
    }
    if (tab === "campaigns" && campaigns.length === 0 && !loadingCampaigns) {
      setLoadingCampaigns(true);
      getWACampaigns(store.id)
        .then(r => setCampaigns(r.campaigns)).catch(() => {})
        .finally(() => setLoadingCampaigns(false));
    }
    if (tab === "templates" && templates.length === 0 && !loadingTemplates) {
      setLoadingTemplates(true);
      getWATemplates(store.id)
        .then(r => setTemplates(r.templates)).catch(() => {})
        .finally(() => setLoadingTemplates(false));
    }
    if (tab === "contacts" && contacts.length === 0 && !loadingContacts) {
      setLoadingContacts(true);
      getWAContacts(store.id)
        .then(r => setContacts(r.contacts)).catch(() => {})
        .finally(() => setLoadingContacts(false));
    }
  }, [open, tab, connected, store?.id]);

  // ── connection handlers ───────────────────────────────────────────────────
  const handleEmbeddedSignup = async () => {
    if (!store?.id) return;
    setEsLoading(true);
    setEsError("");
    try {
      const config = await getWAConfig();
      if (!config.app_id) {
        setEsError("WhatsApp integration is not configured on this platform yet. Please contact support.");
        return;
      }
      await loadFBSDK(config.app_id);
      const code = await new Promise<string>((resolve, reject) => {
        window.FB.login(
          (response: any) => {
            if (response.authResponse?.code) {
              resolve(response.authResponse.code);
            } else {
              reject(new Error(
                response.status === "not_authorized"
                  ? "You cancelled the WhatsApp setup. Please try again."
                  : "Connection was not completed. Please try again.",
              ));
            }
          },
          {
            scope: "whatsapp_business_management,whatsapp_business_messaging,business_management",
            response_type: "code",
            override_default_response_type: true,
            extras: { feature: "whatsapp_embedded_signup", sessionInfoVersion: 2 },
          },
        );
      });
      const result = await waEmbeddedSignup(store.id, code);
      onStoreChange({
        ...store,
        wa_phone_number_id: "connected",
        wa_display_name: result.verified_name || result.waba_name,
        wa_business_phone: result.display_phone?.replace(/\D/g, ""),
      });
      toast({ title: "WhatsApp connected!", description: `Connected as ${result.verified_name || result.display_phone}` });
      setTab("overview");
    } catch (e: any) {
      setEsError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setEsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!store?.id) return;
    setDisconnecting(true);
    try {
      await disconnectWA(store.id);
      onStoreChange({ ...store, wa_phone_number_id: undefined, wa_business_phone: undefined, wa_display_name: undefined });
      setAnalytics(null); setCampaigns([]); setTemplates([]); setContacts([]);
      setTestResult(null);
      toast({ title: "WhatsApp disconnected" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleTest = async () => {
    if (!store?.id) return;
    setTesting(true); setTestResult(null);
    try {
      const r = await testWA(store.id);
      setTestResult(r);
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  // ── campaign handlers ─────────────────────────────────────────────────────
  const resetCampaignForm = () => {
    setCName(""); setCMsg(""); setCAudience("all"); setCSchedule(""); setShowCampaignForm(false);
  };

  const handleSaveCampaign = async () => {
    if (!store?.id || !cName.trim() || !cMsg.trim()) {
      toast({ variant: "destructive", title: "Name and message are required" });
      return;
    }
    setSavingCampaign(true);
    try {
      const scheduledAt = cSchedule ? new Date(cSchedule).getTime() : null;
      const c = await createWACampaign({
        store_id: store.id,
        name: cName.trim(),
        message: cMsg.trim(),
        audience_filter: cAudience,
        scheduled_at: scheduledAt,
      });
      setCampaigns(prev => [c, ...prev]);
      toast({ title: "Campaign saved!" });
      resetCampaignForm();
      // Refresh analytics
      setAnalytics(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleSendCampaign = async (id: string) => {
    setSendingId(id);
    try {
      const r = await sendWACampaign(id);
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: "sending" } : c));
      toast({ title: "Broadcast started!", description: `Sending to ${r.total} contacts` });
      // Refresh after a moment
      setTimeout(() => {
        if (!store?.id) return;
        getWACampaigns(store.id).then(r2 => setCampaigns(r2.campaigns)).catch(() => {});
        getWAAnalytics(store.id).then(setAnalytics).catch(() => {});
      }, 3000);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Send failed", description: e.message });
    } finally {
      setSendingId(null);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    setDeletingCampaignId(id);
    try {
      await deleteWACampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e.message });
    } finally {
      setDeletingCampaignId(null);
    }
  };

  // ── template handlers ─────────────────────────────────────────────────────
  const resetTemplateForm = () => {
    setTName(""); setTBody(""); setTCat("MARKETING"); setEditingTpl(null); setShowTemplateForm(false);
  };

  const openEditTemplate = (t: WaTemplate) => {
    setEditingTpl(t); setTName(t.name); setTBody(t.body); setTCat(t.category); setShowTemplateForm(true);
  };

  const handleSaveTemplate = async () => {
    if (!store?.id || !tName.trim() || !tBody.trim()) {
      toast({ variant: "destructive", title: "Name and message body are required" });
      return;
    }
    setSavingTemplate(true);
    try {
      if (editingTpl) {
        await updateWATemplate(editingTpl.id, { name: tName.trim(), body: tBody.trim(), category: tCat });
        setTemplates(prev => prev.map(t => t.id === editingTpl.id ? { ...t, name: tName.trim(), body: tBody.trim(), category: tCat as any } : t));
        toast({ title: "Template updated!" });
      } else {
        const t = await createWATemplate({ store_id: store.id, name: tName.trim(), body: tBody.trim(), category: tCat });
        setTemplates(prev => [t, ...prev]);
        toast({ title: "Template created!" });
      }
      resetTemplateForm();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    setDeletingTplId(id);
    try {
      await deleteWATemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e.message });
    } finally {
      setDeletingTplId(null);
    }
  };

  // ── contact filter ────────────────────────────────────────────────────────
  const filteredContacts = contacts.filter(c => {
    if (!c.opted_in) return false;
    if (contactFilter === "buyers") return c.total_orders > 0;
    if (contactFilter === "new") return Date.now() - c.joined_at < 7 * 24 * 3600 * 1000;
    return true;
  });

  // ── render ────────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview",   label: "Overview",   icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "campaigns",  label: "Campaigns",  icon: <Megaphone className="h-3.5 w-3.5" /> },
    { id: "templates",  label: "Templates",  icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { id: "contacts",   label: "Contacts",   icon: <Users className="h-3.5 w-3.5" /> },
    { id: "settings",   label: "Settings",   icon: <Settings className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
      {/* ── Header ── */}
      <button
        className="w-full p-5 flex gap-4 items-center text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${connected ? "bg-[#25D366]" : "bg-[#25D366]/20"}`}>
          <WaIcon className={`h-6 w-6 ${connected ? "text-white" : "text-[#25D366]"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="text-base font-semibold text-foreground leading-tight">WhatsApp Marketing</h3>
            {connected ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Connected</span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Not connected</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {connected
              ? `${store?.wa_display_name || "WhatsApp Business"} · Broadcast, campaigns & more`
              : "Send offers, alerts and campaigns to your customers on WhatsApp"}
          </p>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t">
          {/* ── Tab nav ── */}
          <div className="flex border-b overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-[#25D366] text-[#25D366]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── Overview tab ── */}
            {tab === "overview" && (
              <div className="space-y-5">
                {!connected ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mx-auto">
                      <WaIcon className="h-8 w-8 text-[#25D366]" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Connect WhatsApp Business</p>
                      <p className="text-sm text-muted-foreground mt-1">Start broadcasting to your customers in minutes</p>
                    </div>
                    <button
                      onClick={() => setTab("settings")}
                      className="inline-flex items-center gap-2 text-sm font-semibold bg-[#25D366] hover:bg-[#20BA5A] text-white px-5 py-2.5 rounded-xl transition-colors"
                    >
                      <Zap className="h-4 w-4" />
                      Get started
                    </button>
                  </div>
                ) : loadingAnalytics ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Subscribers", value: analytics?.total_contacts ?? 0, icon: <Users className="h-4 w-4" />, color: "text-blue-600" },
                        { label: "Campaigns",   value: analytics?.total_campaigns ?? 0, icon: <Megaphone className="h-4 w-4" />, color: "text-violet-600" },
                        { label: "Msgs Sent",   value: analytics?.total_sent ?? 0,      icon: <Send className="h-4 w-4" />, color: "text-[#25D366]" },
                        { label: "Success Rate", value: `${analytics?.delivery_rate ?? 0}%`, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-amber-600" },
                      ].map(s => (
                        <div key={s.label} className="bg-muted/40 border rounded-xl p-3.5">
                          <div className={`${s.color} mb-1.5`}>{s.icon}</div>
                          <p className="text-xl font-bold text-foreground leading-none">{s.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Recent campaigns */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-foreground uppercase tracking-wide">Recent Campaigns</p>
                        <button onClick={() => setTab("campaigns")} className="text-xs text-[#25D366] font-medium flex items-center gap-1">View all <ChevronRight className="h-3.5 w-3.5" /></button>
                      </div>
                      {(analytics?.recent_campaigns ?? []).length === 0 ? (
                        <div className="text-center py-8 bg-muted/30 rounded-xl">
                          <Megaphone className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No campaigns yet</p>
                          <button
                            onClick={() => { setTab("campaigns"); setShowCampaignForm(true); }}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-[#25D366] hover:bg-[#20BA5A] text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Create first campaign
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(analytics?.recent_campaigns ?? []).slice(0, 4).map(c => (
                            <div key={c.id} className="flex items-center gap-3 bg-muted/30 rounded-xl px-3.5 py-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                                <p className="text-xs text-muted-foreground">{AUDIENCE_LABELS[c.audience_filter]} · {c.stats.sent} sent</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[c.status]?.cls}`}>
                                {STATUS_CONFIG[c.status]?.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick action */}
                    <button
                      onClick={() => { setTab("campaigns"); setShowCampaignForm(true); }}
                      className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-[#25D366] hover:bg-[#20BA5A] text-white py-3 rounded-xl transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Campaign
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── Campaigns tab ── */}
            {tab === "campaigns" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Broadcast Campaigns</p>
                  {!showCampaignForm && connected && (
                    <button
                      onClick={() => setShowCampaignForm(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#25D366] hover:bg-[#20BA5A] text-white px-3.5 py-2 rounded-xl transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New Campaign
                    </button>
                  )}
                </div>

                {!connected && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Connect WhatsApp first to create campaigns.</p>
                    <button onClick={() => setTab("settings")} className="mt-2 text-xs text-[#25D366] font-semibold">Go to Settings →</button>
                  </div>
                )}

                {/* Create form */}
                {showCampaignForm && (
                  <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">New Campaign</p>
                      <button onClick={resetCampaignForm}><X className="h-4 w-4 text-muted-foreground" /></button>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Campaign Name</label>
                        <Input
                          value={cName}
                          onChange={e => setCName(e.target.value)}
                          placeholder="e.g. Summer Sale Offer"
                          className="h-9 text-sm rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">
                          Message
                          <span className="font-normal ml-1 text-[10px]">({cMsg.length}/1024)</span>
                        </label>
                        <textarea
                          value={cMsg}
                          onChange={e => setCMsg(e.target.value)}
                          placeholder="Hi {name}! 🎉 We have a special offer just for you — 20% off on all items today. Shop now: store.advize.in/store/your-store"
                          maxLength={1024}
                          rows={4}
                          className="w-full text-sm rounded-xl border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Tip: use {"{name}"} as a placeholder for the customer's name.</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Audience</label>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(AUDIENCE_LABELS).map(([val, label]) => (
                            <button
                              key={val}
                              onClick={() => setCAudience(val)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                                cAudience === val ? "border-[#25D366] bg-[#25D366]/10 text-[#25D366]" : "border-border text-muted-foreground hover:border-[#25D366]/50"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Schedule (optional)</label>
                        <Input
                          type="datetime-local"
                          value={cSchedule}
                          onChange={e => setCSchedule(e.target.value)}
                          className="h-9 text-sm rounded-xl"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Leave blank to save as draft and send manually.</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSaveCampaign}
                        disabled={savingCampaign}
                        className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-[#25D366] hover:bg-[#20BA5A] text-white py-2.5 rounded-xl disabled:opacity-60 transition-colors"
                      >
                        {savingCampaign ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Save Campaign
                      </button>
                      <button onClick={resetCampaignForm} className="px-4 text-sm text-muted-foreground border rounded-xl hover:bg-muted/50 transition-colors">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Campaign list */}
                {loadingCampaigns ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : campaigns.length === 0 && connected ? (
                  <div className="text-center py-10 bg-muted/30 rounded-xl">
                    <Megaphone className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No campaigns yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create your first broadcast campaign above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map(c => (
                      <div key={c.id} className="border rounded-xl p-4 space-y-3 bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">{c.name}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[c.status]?.cls}`}>
                                {STATUS_CONFIG[c.status]?.label ?? c.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{AUDIENCE_LABELS[c.audience_filter]} · {fmt(c.created_at)}</p>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 line-clamp-2">{c.message}</p>

                        {/* Stats */}
                        {c.stats.total > 0 && (
                          <div className="flex gap-4 text-xs">
                            <span className="text-muted-foreground">Total: <span className="font-semibold text-foreground">{c.stats.total}</span></span>
                            <span className="text-muted-foreground">Sent: <span className="font-semibold text-[#25D366]">{c.stats.sent}</span></span>
                            <span className="text-muted-foreground">Failed: <span className="font-semibold text-red-500">{c.stats.failed}</span></span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {(c.status === "draft" || c.status === "scheduled") && (
                            <button
                              onClick={() => handleSendCampaign(c.id)}
                              disabled={sendingId === c.id}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-[#25D366] hover:bg-[#20BA5A] text-white py-2 rounded-lg disabled:opacity-60 transition-colors"
                            >
                              {sendingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              Send Now
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCampaign(c.id)}
                            disabled={deletingCampaignId === c.id}
                            className="flex items-center justify-center gap-1 text-xs text-muted-foreground border rounded-lg px-3 py-2 hover:text-red-500 hover:border-red-200 disabled:opacity-50 transition-colors"
                          >
                            {deletingCampaignId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Templates tab ── */}
            {tab === "templates" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Message Templates</p>
                  {!showTemplateForm && connected && (
                    <button
                      onClick={() => { resetTemplateForm(); setShowTemplateForm(true); }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#25D366] hover:bg-[#20BA5A] text-white px-3.5 py-2 rounded-xl transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New Template
                    </button>
                  )}
                </div>

                {!connected && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Connect WhatsApp first. <button onClick={() => setTab("settings")} className="text-[#25D366] font-semibold">Go to Settings →</button>
                  </div>
                )}

                {/* Template form */}
                {showTemplateForm && (
                  <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{editingTpl ? "Edit Template" : "New Template"}</p>
                      <button onClick={resetTemplateForm}><X className="h-4 w-4 text-muted-foreground" /></button>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Template Name</label>
                        <Input
                          value={tName}
                          onChange={e => setTName(e.target.value)}
                          placeholder="e.g. Weekend Sale"
                          className="h-9 text-sm rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Category</label>
                        <div className="flex gap-2">
                          {(["MARKETING", "UTILITY", "AUTHENTICATION"] as const).map(cat => (
                            <button
                              key={cat}
                              onClick={() => setTCat(cat)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                                tCat === cat ? "border-[#25D366] bg-[#25D366]/10 text-[#25D366]" : "border-border text-muted-foreground hover:border-[#25D366]/50"
                              }`}
                            >
                              {CAT_LABELS[cat]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Message Body</label>
                        <textarea
                          value={tBody}
                          onChange={e => setTBody(e.target.value)}
                          placeholder="Hi {name}! 🛍️ We have great offers waiting for you. Visit our store: ..."
                          rows={4}
                          maxLength={1024}
                          className="w-full text-sm rounded-xl border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSaveTemplate}
                        disabled={savingTemplate}
                        className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-[#25D366] hover:bg-[#20BA5A] text-white py-2.5 rounded-xl disabled:opacity-60 transition-colors"
                      >
                        {savingTemplate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {editingTpl ? "Update Template" : "Save Template"}
                      </button>
                      <button onClick={resetTemplateForm} className="px-4 text-sm text-muted-foreground border rounded-xl hover:bg-muted/50 transition-colors">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Template list */}
                {loadingTemplates ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : templates.length === 0 && connected ? (
                  <div className="text-center py-10 bg-muted/30 rounded-xl">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No templates yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Save reusable messages for quick campaign creation</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map(t => (
                      <div key={t.id} className="border rounded-xl p-4 bg-card">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{t.name}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                              {CAT_LABELS[t.category] ?? t.category}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => openEditTemplate(t)}
                              className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(t.id)}
                              disabled={deletingTplId === t.id}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                              {deletingTplId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 line-clamp-3">{t.body}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              setCMsg(t.body);
                              setCName(t.name);
                              setTab("campaigns");
                              setShowCampaignForm(true);
                            }}
                            className="text-xs text-[#25D366] font-medium flex items-center gap-1 hover:underline"
                          >
                            <Send className="h-3 w-3" />
                            Use in campaign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Contacts tab ── */}
            {tab === "contacts" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    Subscribers
                    {contacts.length > 0 && <span className="ml-2 text-xs text-muted-foreground font-normal">({filteredContacts.length} shown)</span>}
                  </p>
                  {connected && (
                    <button
                      onClick={() => {
                        if (!store?.id) return;
                        setLoadingContacts(true);
                        getWAContacts(store.id)
                          .then(r => setContacts(r.contacts)).catch(() => {})
                          .finally(() => setLoadingContacts(false));
                      }}
                      className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {!connected && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Connect WhatsApp first. <button onClick={() => setTab("settings")} className="text-[#25D366] font-semibold">Go to Settings →</button>
                  </div>
                )}

                {/* Filter chips */}
                {connected && (
                  <div className="flex gap-2">
                    {(["all", "buyers", "new"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setContactFilter(f)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                          contactFilter === f ? "border-[#25D366] bg-[#25D366]/10 text-[#25D366]" : "border-border text-muted-foreground hover:border-[#25D366]/50"
                        }`}
                      >
                        {f === "all" ? "All" : f === "buyers" ? "Buyers only" : "New this week"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Opt-in widget reminder */}
                {connected && (
                  <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl px-4 py-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-0.5">Growing your subscriber list</p>
                    <p>A "Subscribe on WhatsApp" widget is automatically shown on your store page to customers so they can opt in to receive your offers.</p>
                  </div>
                )}

                {loadingContacts ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : filteredContacts.length === 0 && connected ? (
                  <div className="text-center py-10 bg-muted/30 rounded-xl">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No subscribers yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Customers who opt in on your store page will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredContacts.map(c => (
                      <div key={c.id} className="flex items-center gap-3 border rounded-xl px-3.5 py-3">
                        <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#25D366]">
                            {(c.name || c.phone).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">+{c.phone}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {c.total_orders > 0 && (
                            <p className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 mb-1">
                              {c.total_orders} order{c.total_orders !== 1 ? "s" : ""}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground">{fmt(c.joined_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Settings tab ── */}
            {tab === "settings" && (
              <div className="space-y-5">
                {!connected ? (
                  <div className="space-y-5">
                    {/* Hero */}
                    <div className="text-center py-4 space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mx-auto">
                        <WaIcon className="h-8 w-8 text-[#25D366]" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-foreground">Connect WhatsApp Business</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          Reach your customers on WhatsApp — no developer account or API keys needed.
                        </p>
                      </div>
                    </div>

                    {/* Feature list */}
                    <div className="space-y-2.5">
                      {[
                        "Broadcast campaigns to opted-in customers",
                        "Segment by buyers, new signups, or all subscribers",
                        "Save reusable message templates",
                        "Collect opt-ins with a banner on your store page",
                        "Track delivery and read analytics per campaign",
                      ].map((f, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-[#25D366] flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground">{f}</span>
                        </div>
                      ))}
                    </div>

                    {/* Error */}
                    {esError && (
                      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-xs text-red-700 dark:text-red-400">
                        {esError}
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      onClick={handleEmbeddedSignup}
                      disabled={esLoading}
                      className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-[#25D366] hover:bg-[#20BA5A] text-white py-3 rounded-xl disabled:opacity-60 transition-colors"
                    >
                      {esLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WaIcon className="h-4 w-4" />}
                      {esLoading ? "Connecting…" : "Connect with WhatsApp"}
                    </button>

                    <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                      A secure Meta popup will guide you through the setup. We never see your WhatsApp password.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Connected account */}
                    <div className="flex items-center justify-between gap-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-[#25D366] flex-shrink-0">
                          <WaIcon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{store?.wa_display_name || "WhatsApp Business"}</p>
                          <p className="text-xs text-muted-foreground">+{store?.wa_business_phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleTest}
                          disabled={testing}
                          className="text-xs text-[#25D366] font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
                        >
                          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          {testing ? "Testing…" : "Test"}
                        </button>
                        <button
                          onClick={handleDisconnect}
                          disabled={disconnecting}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                          {disconnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Disconnect
                        </button>
                      </div>
                    </div>

                    {testResult && (
                      <div className={`rounded-xl border px-4 py-3 text-xs space-y-1.5 ${testResult.ok ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`}>
                        <p className={`font-semibold ${testResult.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                          {testResult.ok ? "✓ Connection healthy" : "✗ " + (testResult.error ?? "Connection failed")}
                        </p>
                        {testResult.ok && testResult.verified_name && (
                          <p className="text-muted-foreground">Verified as: <span className="font-semibold text-foreground">{testResult.verified_name}</span></p>
                        )}
                        {testResult.ok && testResult.display_phone_number && (
                          <p className="text-muted-foreground">Phone: <span className="font-semibold text-foreground">{testResult.display_phone_number}</span></p>
                        )}
                        {testResult.ok && testResult.quality_rating && (
                          <p className="text-muted-foreground">Quality rating: <span className="font-semibold text-foreground">{testResult.quality_rating}</span></p>
                        )}
                      </div>
                    )}

                    {/* Info boxes */}
                    <div className="space-y-2">
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
                        <p className="font-semibold mb-1">Important: WhatsApp Messaging Policy</p>
                        <p>You can only send messages to customers who have opted in. Marketing messages outside the 24-hour window require approved template messages from Meta. Always respect opt-out requests.</p>
                      </div>

                      <div className="bg-muted/40 border rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">What's included</p>
                        <p>• Broadcast campaigns to opted-in contacts</p>
                        <p>• Audience segmentation (all / buyers / new)</p>
                        <p>• Reusable message templates</p>
                        <p>• Opt-in widget on your store page</p>
                        <p>• Delivery analytics per campaign</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
