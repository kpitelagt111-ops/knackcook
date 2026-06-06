import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Legal Notice", alternates: { canonical: "/legal/notice" } };
}

export default async function LegalNoticePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      <section className="border-b border-border bg-paper-soft">
        <Container size="md" className="py-14 sm:py-20">
          <SectionHeading
            level="h1"
            eyebrow="Legal"
            title="Legal Notice / Imprint"
            kicker="Operator details, editorial responsibility, and liability statements."
          />
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Last updated: May 2026
          </p>
        </Container>
      </section>

      <section>
        <Container size="md" className="py-14 sm:py-20">
          <article className="prose prose-article">
            <h2>Site operator</h2>
            <p>This website, KnackCook (knackcook.com), is operated by:</p>
            <address>
              <strong>{"{{OPERATOR_NAME}}"}</strong>
              <br />
              {"{{OPERATOR_ADDRESS}}"}
              <br />
              Email: <a href={"mailto:{{OPERATOR_EMAIL}}"}>{"{{OPERATOR_EMAIL}}"}</a>
            </address>
            <p>
              <em>
                Replace the <code>{"{{OPERATOR_*}}"}</code> placeholders above with your legal name,
                registered address, and contact email before publishing.
              </em>
            </p>

            <h2>Purpose of this site</h2>
            <p>
              KnackCook is an editorial website covering kitchen equipment. It participates in the
              Amazon Services LLC Associates Program and earns commissions on qualifying purchases
              made through affiliate links. See our{" "}
              <a href="/affiliate-disclosure">Affiliate Disclosure</a> for full details.
            </p>

            <h2>Responsible for content</h2>
            <p>
              The person responsible for the editorial content of this site is the operator named
              above.
            </p>

            <h2>Dispute resolution</h2>
            <p>
              The European Commission provides an online dispute resolution (ODR) platform at{" "}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://ec.europa.eu/consumers/odr
              </a>
              . We are not obliged to participate in dispute resolution proceedings before a
              consumer arbitration board and do not currently do so.
            </p>

            <h2>Liability for content</h2>
            <p>
              The content on this site is provided for informational purposes only. We make every
              effort to keep information accurate and up to date, but we can&rsquo;t guarantee
              completeness or accuracy. Product prices and availability are sourced from Amazon and
              may change without notice. We accept no liability for decisions made based on
              information published here.
            </p>

            <h2>Liability for links</h2>
            <p>
              This site contains links to external websites. We have no control over the content of
              those sites and accept no liability for them. The operators of linked sites are solely
              responsible for their content.
            </p>

            <h2>Copyright</h2>
            <p>
              All original content on this site (text, editorial images, graphics) is the property
              of the site operator and may not be reproduced without permission. Product names and
              trademarks belong to their respective owners.
            </p>

            <h2>Contact</h2>
            <p>
              For any legal, privacy, or general enquiries, contact us at{" "}
              <a href={"mailto:{{OPERATOR_EMAIL}}"}>{"{{OPERATOR_EMAIL}}"}</a>.
            </p>
          </article>
        </Container>
      </section>
    </main>
  );
}
