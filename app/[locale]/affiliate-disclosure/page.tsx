import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Affiliate Disclosure", alternates: { canonical: "/affiliate-disclosure" } };
}

export default async function AffiliateDisclosurePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      <section className="border-b border-border bg-paper-soft">
        <Container size="md" className="py-14 sm:py-20">
          <SectionHeading
            level="h1"
            eyebrow="Transparency"
            title="Affiliate Disclosure"
            kicker="How KnackCook earns from affiliate links, and what that means for you."
          />
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Last updated: May 2026
          </p>
        </Container>
      </section>

      <section>
        <Container size="md" className="py-14 sm:py-20">
          <article className="prose prose-article">
            <h2>Amazon Associates</h2>
            <p>
              KnackCook (knackcook.com) is a participant in the Amazon Services LLC Associates
              Program, an affiliate advertising program designed to provide a means for sites to
              earn advertising fees by advertising and linking to Amazon.com and its affiliated
              stores.
            </p>
            <p>
              <strong>As an Amazon Associate I earn from qualifying purchases.</strong>
            </p>

            <h2>What this means for you</h2>
            <p>
              Some links on this site are affiliate links. When you click one of those links and
              make a purchase, we may receive a small commission from Amazon at no extra cost to
              you. The price you pay is exactly the same whether you use our link or go directly to
              Amazon.
            </p>
            <p>
              Commissions help us keep the site running, fund independent testing, and write honest
              reviews. We only recommend products we genuinely believe are worth your money.
            </p>

            <h2>How to spot an affiliate link</h2>
            <p>
              Every &ldquo;View on Amazon&rdquo; or &ldquo;See on Amazon&rdquo; button on this site
              is an affiliate link. The URL will contain our Associates tag. We don&rsquo;t hide
              this &mdash; it&rsquo;s right there in the link if you hover over it.
            </p>

            <h2>Prices and availability</h2>
            <p>
              When prices are displayed on this site, they come directly from the Amazon API and are
              accurate at the time of the last data refresh (shown alongside the price). Prices and
              product availability can change at any time. Always check the current price on Amazon
              before purchasing. KnackCook is not responsible for price discrepancies between what
              is shown here and what Amazon charges at checkout.
            </p>

            <h2>Editorial independence</h2>
            <p>
              Our reviews and recommendations are our own. We don&rsquo;t accept payment for
              positive reviews, and affiliate relationships don&rsquo;t influence our editorial
              ratings. Products are evaluated on their own merits.
            </p>

            <h2>FTC compliance</h2>
            <p>
              This disclosure is made in accordance with the Federal Trade Commission&rsquo;s
              guidelines on endorsements and testimonials (16 CFR Part 255). We believe in full
              transparency about how this site earns revenue.
            </p>

            <h2>Questions?</h2>
            <p>
              If you have any questions about our affiliate relationships, contact us at the address
              listed on our <a href="/legal/notice">Legal Notice</a> page.
            </p>
          </article>
        </Container>
      </section>
    </main>
  );
}
