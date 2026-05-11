import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";

export function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-16">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-1">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Effective Date: May 11, 2026</p>

        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-8 text-foreground">

          <p>
            Advize Store ("we", "our", or "us") provides creator-commerce tools that integrate with Instagram and Meta
            platforms to help creators and store owners automate messaging and customer engagement.
          </p>

          <Section num="1" title="Information We Collect">
            <p>When users connect their Instagram or Facebook accounts through Meta Login, we may collect:</p>
            <ul>
              <li>Public profile information</li>
              <li>Instagram account ID</li>
              <li>Username and profile details</li>
              <li>Connected Facebook Page information</li>
              <li>Access tokens provided by Meta</li>
              <li>Messaging permissions granted by the user</li>
            </ul>
            <p>We only access data necessary to provide automation and storefront-related services.</p>
          </Section>

          <Section num="2" title="How We Use Information">
            <p>We use the collected information to:</p>
            <ul>
              <li>Enable Instagram messaging automation</li>
              <li>Connect creators with storefronts</li>
              <li>Send automated replies and order-related messages</li>
              <li>Improve platform functionality and security</li>
              <li>Maintain integrations with Meta APIs</li>
            </ul>
          </Section>

          <Section num="3" title="Data Sharing">
            <p>Advize Store does not sell personal data to third parties.</p>
            <p>We may share data only:</p>
            <ul>
              <li>When required by law</li>
              <li>With trusted infrastructure / service providers necessary to operate the platform</li>
              <li>As required for Meta platform compliance</li>
            </ul>
          </Section>

          <Section num="4" title="Data Security">
            <p>
              We implement reasonable security measures to protect user information and access tokens from unauthorized
              access, misuse, or disclosure.
            </p>
          </Section>

          <Section num="5" title="User Control">
            <p>
              Users may disconnect their Instagram or Facebook accounts at any time through the Advize Store dashboard
              (Plugins → Instagram DM Automation → Disconnect) or directly through Meta account settings.
            </p>
          </Section>

          <Section num="6" title="Data Deletion">
            <p>
              Users may request deletion of their connected account data by contacting us at{" "}
              <a href="mailto:contact@advize.in" className="text-primary underline underline-offset-2">
                contact@advize.in
              </a>.
              Upon verification, associated account data will be deleted within a reasonable timeframe.
            </p>
          </Section>

          <Section num="7" title="Meta & Instagram Integration">
            <p>
              Advize Store integrates with Meta Platforms, including Instagram and Facebook APIs. When you connect your
              Instagram account, you authorise Advize Store to access messaging data solely for the purpose of sending
              automated keyword-based replies on your behalf.
            </p>
            <p>
              Use of Instagram and Facebook APIs is also governed by{" "}
              <a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noopener noreferrer">
                Meta's Privacy Policy
              </a>{" "}
              and{" "}
              <a href="https://developers.facebook.com/terms" target="_blank" rel="noopener noreferrer">
                Meta Platform Terms
              </a>.
            </p>
          </Section>

          <Section num="8" title="Third-Party Services">
            <p>
              Advize Store integrates with Meta Platforms, including Instagram and Facebook APIs. Use of those services
              is also governed by Meta's own policies and terms.
            </p>
          </Section>

          <Section num="9" title="Changes to This Policy">
            <p>
              We may update this Privacy Policy periodically. Continued use of the platform after updates constitutes
              acceptance of the revised policy.
            </p>
          </Section>

          <Section num="10" title="Contact">
            <p>For questions regarding this Privacy Policy, contact:</p>
            <ul>
              <li>
                Email:{" "}
                <a href="mailto:contact@advize.in" className="text-primary underline underline-offset-2">
                  contact@advize.in
                </a>
              </li>
              <li>
                Website:{" "}
                <a href="https://store.advize.in" className="text-primary underline underline-offset-2">
                  store.advize.in
                </a>
              </li>
            </ul>
          </Section>

          <div className="border-t pt-6 mt-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              By using Advize Store, you acknowledge that you have read and understood this Privacy Policy.
            </p>
            <p className="text-sm text-muted-foreground">
              To request deletion of your data, visit our{" "}
              <Link href="/data-deletion" className="text-primary underline underline-offset-2">
                Data Deletion page
              </Link>.
            </p>
          </div>

        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Advize Technology Private Limited. All rights reserved.
        {" · "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms of Service</Link>
      </footer>
    </div>
  );
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">
        {num}. {title}
      </h2>
      <div className="space-y-2 text-muted-foreground leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </div>
  );
}
