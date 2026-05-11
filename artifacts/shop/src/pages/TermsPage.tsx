import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";

export function TermsPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-16">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-1">
          Terms and Conditions
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Last Updated: 29 April 2026</p>

        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-8 text-foreground">

          <p>
            Welcome to <strong>Advize Store</strong> ("Platform"), operated by <strong>Advize Technology Private Limited</strong>{" "}
            ("Company", "we", "our", or "us"). By accessing or using our platform, including{" "}
            <a href="https://store.advize.in" className="text-primary underline underline-offset-2">store.advize.in</a>,
            you agree to comply with and be bound by these Terms and Conditions.
          </p>

          <Section num="1" title="Platform Nature">
            <p>Advize Store is a <strong>technology platform</strong> that enables users to create content, run promotions, and operate online stores.</p>
            <p>Advize Store allows independent sellers ("Sellers") to create digital storefronts and list products/services.</p>
            <ul>
              <li>Does <strong>not own or manufacture</strong> products listed on stores</li>
              <li>Does <strong>not directly sell</strong> products to customers</li>
              <li>Acts only as an <strong>intermediary platform</strong></li>
            </ul>
          </Section>

          <Section num="2" title="User Eligibility">
            <p>By using the Platform, you confirm:</p>
            <ul>
              <li>You are at least 18 years old</li>
              <li>You are capable of entering into a legally binding agreement</li>
            </ul>
          </Section>

          <Section num="3" title="Content Creators & Promotions">
            <p>Users using Advize Store for content creation, promotions, or campaigns are responsible for:</p>
            <ul>
              <li>Accuracy and legality of content</li>
              <li>Avoiding misleading advertisements</li>
              <li>Ensuring compliance with applicable laws</li>
            </ul>
            <p>Advize Store is not responsible for user-generated content.</p>
          </Section>

          <Section num="4" title="Advize Store — Marketplace Terms">
            <p>For users accessing Advize Store (<a href="https://store.advize.in" className="text-primary underline underline-offset-2">store.advize.in</a>):</p>
            <p>Sellers are solely responsible for:</p>
            <ul>
              <li>Product quality, authenticity, and accuracy</li>
              <li>Pricing and descriptions</li>
              <li>Order fulfillment, delivery, and returns</li>
              <li>Customer support</li>
            </ul>
            <p>Advize Store acts only as a <strong>platform facilitator</strong> and is not liable for product defects, delivery issues, or seller misconduct.</p>
          </Section>

          <Section num="5" title="Orders & Payments">
            <ul>
              <li>Payments are processed via third-party gateways (such as Razorpay or similar providers)</li>
              <li>Advize Store does not store sensitive payment details</li>
              <li>Payment disputes must be resolved between the Buyer, Seller, and payment provider</li>
            </ul>
          </Section>

          <Section num="6" title="Refunds & Returns">
            <ul>
              <li>Refund and return policies are defined by individual Sellers</li>
              <li>Advize Store does not guarantee refunds unless explicitly stated</li>
              <li>Buyers must contact Sellers directly for resolution</li>
            </ul>
          </Section>

          <Section num="7" title="Prohibited Activities">
            <p>Users agree NOT to:</p>
            <ul>
              <li>Post false, misleading, or illegal content</li>
              <li>Sell prohibited or restricted items</li>
              <li>Attempt fraud, hacking, or misuse of the platform</li>
              <li>Violate any applicable laws</li>
            </ul>
            <p>Advize Store reserves the right to suspend or terminate accounts violating these terms.</p>
          </Section>

          <Section num="8" title="Intellectual Property">
            <ul>
              <li>All platform design, branding, and technology belong to Advize Store</li>
              <li>Users retain ownership of their content</li>
              <li>Unauthorized use of platform content is prohibited</li>
            </ul>
          </Section>

          <Section num="9" title="Limitation of Liability">
            <p>Advize Store shall not be liable for:</p>
            <ul>
              <li>Product defects, delays, or damages</li>
              <li>Seller misconduct or fraud</li>
              <li>Content inaccuracies</li>
              <li>Payment failures or technical issues</li>
            </ul>
            <p>Use of the platform is at your own risk.</p>
          </Section>

          <Section num="10" title="Indemnification">
            <p>Users agree to indemnify and hold Advize Store harmless from:</p>
            <ul>
              <li>Claims arising from their use of the platform</li>
              <li>Violations of these Terms</li>
              <li>Seller or content-related disputes</li>
            </ul>
          </Section>

          <Section num="11" title="Account Suspension">
            <p>Advize Store reserves the right to:</p>
            <ul>
              <li>Suspend or terminate accounts</li>
              <li>Remove listings or content</li>
              <li>Restrict access</li>
            </ul>
            <p>Without prior notice in case of violations.</p>
          </Section>

          <Section num="12" title="Modifications">
            <p>Advize Store may update these Terms at any time. Continued use of the Platform means you accept the updated Terms.</p>
          </Section>

          <Section num="13" title="Governing Law">
            <p>
              These Terms shall be governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in{" "}
              <strong>Gorakhpur</strong>.
            </p>
          </Section>

          <Section num="14" title="Contact">
            <p>For any queries, contact:</p>
            <ul>
              <li>Email: <a href="mailto:Advizeteam@gmail.com" className="text-primary underline underline-offset-2">Advizeteam@gmail.com</a></li>
              <li>Website: <a href="https://store.advize.in" className="text-primary underline underline-offset-2">store.advize.in</a></li>
            </ul>
          </Section>

          <div className="border-t pt-6 mt-8">
            <p className="text-sm text-muted-foreground">
              By using Advize Store, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.
            </p>
          </div>

        </div>

        {/* ── Privacy Policy ─────────────────────────────────── */}
        <div className="mt-20 pt-10 border-t">
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
                <a href="mailto:contact@advize.in" className="text-primary underline underline-offset-2">contact@advize.in</a>.
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
                <a
                  href="https://www.facebook.com/privacy/policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Meta's Privacy Policy
                </a>{" "}
                and{" "}
                <a
                  href="https://developers.facebook.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
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
                <li>Email: <a href="mailto:contact@advize.in" className="text-primary underline underline-offset-2">contact@advize.in</a></li>
                <li>Website: <a href="https://store.advize.in" className="text-primary underline underline-offset-2">store.advize.in</a></li>
              </ul>
            </Section>

          </div>
        </div>

      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Advize Technology Private Limited. All rights reserved.
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
      <div className="space-y-2 text-muted-foreground leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-foreground [&_a]:text-primary">
        {children}
      </div>
    </div>
  );
}
