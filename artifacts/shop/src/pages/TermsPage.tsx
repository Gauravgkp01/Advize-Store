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
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Effective Date: May 11, 2026</p>

        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-8 text-foreground">

          <p>
            Welcome to <strong>Advize Store</strong> ("Advize", "we", "our", or "us"). By accessing or using our
            platform, website, applications, or services, you agree to comply with and be bound by these Terms of Service.
          </p>

          <Section num="1" title="Overview">
            <p>
              Advize Store is a creator-commerce platform that enables store owners and creators to connect their social
              media accounts, manage storefronts, automate customer interactions, and promote products.
            </p>
          </Section>

          <Section num="2" title="Eligibility">
            <p>By using Advize Store, you confirm that:</p>
            <ul>
              <li>You are at least 18 years old or legally authorized to use the platform</li>
              <li>You have the authority to connect and manage the social media accounts you authorize</li>
              <li>You comply with all applicable laws and platform policies</li>
            </ul>
          </Section>

          <Section num="3" title="Account Responsibilities">
            <p>Users are responsible for:</p>
            <ul>
              <li>Maintaining the security of their accounts</li>
              <li>Keeping login credentials confidential</li>
              <li>Ensuring connected Instagram/Facebook accounts comply with Meta policies</li>
              <li>All activities performed through their accounts</li>
            </ul>
            <p>Advize Store is not responsible for unauthorized access resulting from user negligence.</p>
          </Section>

          <Section num="4" title="Meta & Instagram Integrations">
            <p>
              Advize Store integrates with Meta Platforms, including Instagram and Facebook APIs. By connecting your
              accounts, you authorize Advize Store to access permitted account information and messaging capabilities
              necessary to provide automation and storefront services.
            </p>
            <p>Users must comply with:</p>
            <ul>
              <li>
                <a href="https://developers.facebook.com/terms" target="_blank" rel="noopener noreferrer">
                  Meta Platform Terms
                </a>
              </li>
              <li>
                <a href="https://help.instagram.com/581066165581870" target="_blank" rel="noopener noreferrer">
                  Instagram Terms of Use
                </a>
              </li>
              <li>Applicable API usage policies</li>
            </ul>
          </Section>

          <Section num="5" title="Prohibited Activities">
            <p>Users may not use Advize Store to:</p>
            <ul>
              <li>Send spam or unsolicited messages</li>
              <li>Violate Instagram or Meta policies</li>
              <li>Promote illegal products or services</li>
              <li>Infringe intellectual property rights</li>
              <li>Mislead customers or impersonate others</li>
              <li>Abuse automation systems</li>
            </ul>
            <p>Advize Store reserves the right to suspend or terminate accounts violating these terms.</p>
          </Section>

          <Section num="6" title="Platform Availability">
            <p>We aim to provide reliable services but do not guarantee uninterrupted availability.</p>
            <p>Features, APIs, or integrations may change due to:</p>
            <ul>
              <li>Meta platform updates</li>
              <li>Technical limitations</li>
              <li>Maintenance</li>
              <li>Regulatory requirements</li>
            </ul>
          </Section>

          <Section num="7" title="Payments & Transactions">
            <p>Advize Store may offer paid services, subscriptions, or transaction-based features.</p>
            <p>Users are responsible for:</p>
            <ul>
              <li>Applicable taxes</li>
              <li>Payment processing fees</li>
              <li>Compliance with local commerce regulations</li>
            </ul>
            <p>All payments are subject to the pricing displayed at the time of purchase.</p>
          </Section>

          <Section num="8" title="Intellectual Property">
            <p>
              All platform content, branding, software, and technology associated with Advize Store remain the property
              of Advize Store unless otherwise stated.
            </p>
            <p>Users retain ownership of their own content and connected social media assets.</p>
          </Section>

          <Section num="9" title="Limitation of Liability">
            <p>Advize Store is provided "as is" without warranties of any kind.</p>
            <p>To the maximum extent permitted by law, Advize Store shall not be liable for:</p>
            <ul>
              <li>Business losses</li>
              <li>Revenue loss</li>
              <li>Account suspensions by third-party platforms</li>
              <li>API limitations imposed by Meta</li>
              <li>Indirect or consequential damages</li>
            </ul>
          </Section>

          <Section num="10" title="Termination">
            <p>
              We reserve the right to suspend or terminate access to the platform at our discretion if users violate
              these Terms or applicable laws.
            </p>
            <p>Users may stop using the platform and disconnect integrations at any time.</p>
          </Section>

          <Section num="11" title="Privacy">
            <p>
              Use of Advize Store is also governed by our{" "}
              <Link href="/privacy" className="text-primary underline underline-offset-2">Privacy Policy</Link>.
            </p>
          </Section>

          <Section num="12" title="Changes to Terms">
            <p>
              We may update these Terms periodically. Continued use of the platform after changes indicates acceptance
              of the updated Terms.
            </p>
          </Section>

          <Section num="13" title="Contact">
            <p>For questions regarding these Terms, contact:</p>
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

          <div className="border-t pt-6 mt-8">
            <p className="text-sm text-muted-foreground">
              By using Advize Store, you acknowledge that you have read, understood, and agreed to these Terms of Service.
            </p>
          </div>

        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Advize Technology Private Limited. All rights reserved.
        {" · "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</Link>
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
