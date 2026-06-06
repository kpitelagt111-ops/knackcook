import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "How We Research",
    description:
      "KnackCook is a research-first site. Here's exactly how we evaluate cookware — what we do, what we don't, and why that produces honest recommendations.",
    alternates: { canonical: "/how-we-research" },
  };
}

export default async function HowWeResearchPage({
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
            eyebrow="Methodology"
            title="How We Research"
            kicker="Research-first, not a test kitchen — and why that produces more reliable recommendations than one editor with one pan."
          />
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Last updated: June 2026
          </p>
        </Container>
      </section>

      <section>
        <Container size="md" className="py-14 sm:py-20">
          <article className="prose prose-article">
            <p>
              We&rsquo;ll be upfront:{" "}
              <strong>
                KnackCook is a research-first site. We do not run a physical test kitchen, and we
                don&rsquo;t claim to.
              </strong>{" "}
              We think that&rsquo;s actually a strength &mdash; instead of one editor&rsquo;s
              experience with one pan, our recommendations are built on{" "}
              <strong>data from thousands of real owners.</strong>
            </p>
            <p>Here&rsquo;s exactly how we work.</p>

            <h2>1. We aggregate real owner reviews &mdash; at scale</h2>
            <p>
              For every product we cover, we read and analyze{" "}
              <strong>hundreds to thousands of verified purchaser reviews</strong>. One person
              cooking on one stove is an anecdote. A thousand owners reporting the same problem is{" "}
              <strong>data</strong>. We&rsquo;re especially interested in the critical (1&ndash;2★)
              reviews, because that&rsquo;s where real-world failure modes show up.
            </p>

            <h2>2. We cross-reference independent communities</h2>
            <p>
              Amazon reviews are only one source. We pull real-world reports from{" "}
              <strong>
                cooking communities (Reddit&rsquo;s r/castiron, r/cooking), owner forums, and
                manufacturer Q&amp;A
              </strong>{" "}
              &mdash; places where people have no incentive to flatter a product.
            </p>

            <h2>3. We use manufacturer specs and published standards</h2>
            <p>
              Weight, base diameter, base finish, heat tolerance, material &mdash; we record the{" "}
              <strong>measurable facts</strong> from official spec sheets and compare them
              like-for-like. We treat marketing copy as a claim to verify, never as fact.
            </p>

            <h2>4. We score with a transparent, consistent rubric</h2>
            <p>
              Every product gets a <strong>0&ndash;10 KnackCook Score</strong> from the same
              weighted criteria (demand, owner-satisfaction signals, fit-for-purpose, value, and
              durability/complaint signals). The same rubric applies to a $25 pan and a $200 one, so
              scores are comparable across the site.
            </p>

            <h2>5. A human reviews and signs off</h2>
            <p>
              AI helps us read and structure data at a scale no person could. But{" "}
              <strong>a human editor reviews every recommendation</strong> before it publishes,
              checks every claim against a source, and makes the final call. A person stands behind
              every page.
            </p>

            <h2>6. We update as the data changes</h2>
            <p>
              Products, prices, and quality drift. We revisit our top guides regularly and revise
              rankings when the data moves.
            </p>

            <h2>What we don&rsquo;t do (so you can trust what we do)</h2>
            <ul>
              <li>
                We <strong>don&rsquo;t pretend to have hand-tested</strong> products we
                haven&rsquo;t. If a recommendation is research-based, we say so.
              </li>
              <li>
                We <strong>don&rsquo;t let commissions change our rankings.</strong> We earn
                affiliate commissions (see below), but the score is set by the rubric, not by who
                pays more.
              </li>
              <li>
                We <strong>don&rsquo;t republish manufacturer marketing</strong> as if it were an
                independent finding.
              </li>
              <li>
                We <strong>don&rsquo;t use AI to mass-produce filler.</strong> Every page has to
                contain something &mdash; usually original data analysis &mdash; you can&rsquo;t get
                from the top results already out there.
              </li>
            </ul>

            <h2>Affiliate disclosure</h2>
            <p>
              KnackCook is reader-supported. When you buy through links on our site, we may earn an
              affiliate commission (e.g., as an Amazon Associate, we earn from qualifying purchases){" "}
              <strong>at no extra cost to you.</strong> This never affects our rankings or which
              products we recommend. See our <a href="/affiliate-disclosure">full disclosure</a>.
            </p>

            <h2>Who writes this</h2>
            <p>
              KnackCook&rsquo;s research is led by{" "}
              <a href="/author/marlowe-finch">
                <strong>Marlowe Finch</strong>
              </a>
              , our research analyst. We don&rsquo;t lab-test &mdash; Marlowe and our research
              process analyze thousands of verified owner reviews, manufacturer specifications, and
              real-world community reports to find what actually holds up on modern stovetops.
            </p>
          </article>
        </Container>
      </section>
    </main>
  );
}
