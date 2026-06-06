import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const revalidate = 86400;

const TITLE = "About";
const DESC =
  "KnackCook is a reader-supported, research-first cookware site — honest verdicts built on real owner data, not marketing copy.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TITLE,
    description: DESC,
    alternates: { canonical: "/about" },
    openGraph: {
      type: "website",
      url: "/about",
      siteName: "KnackCook",
      title: `${TITLE} | KnackCook`,
      description: DESC,
      images: [{ url: "/icon.png", width: 512, height: 512, alt: "KnackCook" }],
    },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      <section className="border-b border-border bg-paper-soft">
        <Container size="md" className="py-14 sm:py-20">
          <SectionHeading
            level="h1"
            eyebrow="Who we are"
            title="About KnackCook"
            kicker="An honest, research-first guide to cookware — built on what real owners report, not on marketing copy."
          />
        </Container>
      </section>

      <section>
        <Container size="md" className="py-14 sm:py-20">
          <article className="prose prose-article">
            <p>
              KnackCook is a <strong>reader-supported, research-first cookware site.</strong> Our
              job is simple: help you buy the right pan once, without wading through sponsored
              hot-takes and copied spec sheets to get there.
            </p>

            <h2>Why we exist</h2>
            <p>
              Most cookware advice online is either an advertisement in disguise or one
              editor&rsquo;s take on the one pan they happen to own. Neither tells you what a piece
              is actually like to live with for years. We start from the opposite end:{" "}
              <strong>what real owners report</strong> &mdash; at scale, including the complaints
              &mdash; and turn that into a clear, comparable verdict.
            </p>

            <h2>How we&rsquo;re different</h2>
            <ul>
              <li>
                <strong>Research-first, no pretense.</strong> We don&rsquo;t run a physical test
                kitchen, and we never pretend to. When a recommendation is research-based, we say
                so.
              </li>
              <li>
                <strong>A transparent 0&ndash;10 score.</strong> Every product is graded on the same
                rubric, so a $25 pan and a $200 one are judged the same way.
              </li>
              <li>
                <strong>Commissions never move the rankings.</strong> We earn affiliate commissions,
                but the score is set by the evidence, not by who pays more.
              </li>
              <li>
                <strong>A human signs off.</strong> AI helps us read data at a scale no person
                could, but an editor checks every claim against a source before anything publishes.
              </li>
            </ul>
            <p>
              The full method is laid out, step by step, on our{" "}
              <a href="/how-we-research">How We Research</a> page.
            </p>

            <h2>What we cover</h2>
            <p>
              Our focus is <strong>non-toxic, PFAS-free cookware</strong> &mdash; ceramic nonstick
              as the everyday workhorse, plus the durable classics like cast iron where they
              genuinely earn a place. The goal is the same across all of it: honest picks that hold
              up on real, modern stovetops.
            </p>

            <h2>Who&rsquo;s behind it</h2>
            <p>
              KnackCook&rsquo;s research is led by{" "}
              <a href="/author/marlowe-finch">
                <strong>Marlowe Finch</strong>
              </a>
              , our research analyst. The process analyzes owner reviews, manufacturer
              specifications, and real-world community reports to find what actually holds up
              &mdash; and a human editor makes the final call on every recommendation.
            </p>

            <h2>How we&rsquo;re funded</h2>
            <p>
              KnackCook is reader-supported. When you buy through links on our site, we may earn an
              affiliate commission (for example, as an Amazon Associate, we earn from qualifying
              purchases) <strong>at no extra cost to you.</strong> This never affects our rankings
              or which products we recommend. See our{" "}
              <a href="/affiliate-disclosure">full disclosure</a>.
            </p>
          </article>
        </Container>
      </section>
    </main>
  );
}
