import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft, Mail, Trash2, ShieldCheck, Clock } from "lucide-react";

export function DataDeletionPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-16">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-1">
          User Data Deletion
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Effective Date: May 11, 2026</p>

        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-8 text-foreground">

          <p>
            Advize Store respects user privacy and provides users the ability to request deletion of their connected
            account data at any time.
          </p>

          {/* ── How to Request ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground m-0">How to Request Data Deletion</h2>
            </div>
            <div className="space-y-2 text-muted-foreground leading-relaxed pl-2">
              <p>To request deletion of your data, send an email to:</p>
              <div className="bg-muted/40 border rounded-xl px-4 py-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <a href="mailto:contact@advize.in" className="text-primary font-semibold underline underline-offset-2">
                  contact@advize.in
                </a>
              </div>
              <p className="pt-1">Please include the following in your email:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Full Name</li>
                <li>Connected Instagram Username</li>
                <li>Registered Email Address</li>
              </ul>
              <p>Use the subject line: <strong className="text-foreground">"Data Deletion Request"</strong></p>
            </div>
          </div>

          {/* ── What Will Be Deleted ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-destructive/10 flex-shrink-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              <h2 className="text-lg font-bold text-foreground m-0">What Data Will Be Deleted</h2>
            </div>
            <div className="space-y-2 text-muted-foreground leading-relaxed pl-2">
              <p>Upon verification, Advize Store will delete:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Connected Instagram account information</li>
                <li>Facebook Page connection details</li>
                <li>Stored access tokens</li>
                <li>Messaging integration data</li>
                <li>Related automation settings</li>
              </ul>
            </div>
          </div>

          {/* ── Timeline ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 flex-shrink-0">
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <h2 className="text-lg font-bold text-foreground m-0">Deletion Timeline</h2>
            </div>
            <div className="pl-2 text-muted-foreground leading-relaxed">
              <p>
                Verified deletion requests are typically processed within{" "}
                <strong className="text-foreground">7–30 business days</strong>.
              </p>
            </div>
          </div>

          {/* ── Disconnect via Meta ── */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Disconnecting via Meta</h2>
            <div className="space-y-2 text-muted-foreground leading-relaxed">
              <p>You may also remove Advize Store access directly through your Meta settings:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Open <strong className="text-foreground">Facebook Settings</strong></li>
                <li>
                  Navigate to{" "}
                  <strong className="text-foreground">Business Integrations</strong> /
                  {" "}<strong className="text-foreground">Apps and Websites</strong>
                </li>
                <li>Remove <strong className="text-foreground">Advize Store</strong></li>
              </ol>
              <p>This will revoke all API access permissions associated with your account.</p>
              <div className="bg-muted/40 border rounded-xl px-4 py-3 text-sm">
                You can also disconnect Instagram from within the Advize Store dashboard:{" "}
                <strong className="text-foreground">Plugins → Instagram DM Automation → Disconnect</strong>.
              </div>
            </div>
          </div>

          {/* ── Retained Information ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 flex-shrink-0">
                <ShieldCheck className="h-4 w-4 text-amber-500" />
              </div>
              <h2 className="text-lg font-bold text-foreground m-0">Retained Information</h2>
            </div>
            <div className="space-y-2 text-muted-foreground leading-relaxed pl-2">
              <p>Certain information may be retained temporarily if required for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Legal compliance</li>
                <li>Fraud prevention</li>
                <li>Security monitoring</li>
                <li>Financial or transaction records where applicable</li>
              </ul>
            </div>
          </div>

          {/* ── Contact ── */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Contact</h2>
            <div className="text-muted-foreground leading-relaxed">
              <p>For any questions related to data deletion, contact:</p>
              <div className="mt-3 bg-muted/40 border rounded-xl px-4 py-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <a href="mailto:contact@advize.in" className="text-primary font-semibold underline underline-offset-2">
                  contact@advize.in
                </a>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 mt-8">
            <p className="text-sm text-muted-foreground">
              See also our{" "}
              <Link href="/privacy" className="text-primary underline underline-offset-2">Privacy Policy</Link>
              {" "}and{" "}
              <Link href="/terms" className="text-primary underline underline-offset-2">Terms of Service</Link>.
            </p>
          </div>

        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Advize Technology Private Limited. All rights reserved.
        {" · "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</Link>
        {" · "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms of Service</Link>
      </footer>
    </div>
  );
}
