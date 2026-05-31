import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Cookie Policy" };
}

export default async function CookiePolicyPage({
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
            eyebrow="Legal"
            title="Cookie Policy"
            kicker="The cookies we set, why, and how to manage them."
          />
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Last updated: May 2026
          </p>
        </Container>
      </section>

      <section>
        <Container size="md" className="py-14 sm:py-20">
          <article className="prose prose-article">
            <p>
              This Cookie Policy explains what cookies are, which ones we use on KnackCook
              (knackcook.com), and how you can control them.
            </p>

            <h2>1. What are cookies?</h2>
            <p>
              Cookies are small text files that a website stores on your device when you visit. They
              help the site remember information about your visit, such as your preferences or
              consent choices. Cookies can&rsquo;t run programs or deliver viruses.
            </p>

            <h2>2. Essential cookies</h2>
            <p>
              Essential cookies are strictly necessary for the site to function. They don&rsquo;t
              require your consent and can&rsquo;t be switched off. We use them for:
            </p>
            <ul>
              <li>
                <strong>Consent preference storage:</strong> remembering whether you&rsquo;ve
                accepted or declined non-essential cookies, so we don&rsquo;t ask you every time.
              </li>
              <li>
                <strong>Security:</strong> CSRF tokens and session integrity where applicable.
              </li>
            </ul>
            <p>
              These cookies contain no personally identifiable information and are deleted when you
              close your browser or after a short fixed period.
            </p>

            <h2>3. Non-essential cookies</h2>
            <p>
              Non-essential cookies are only set after you give explicit consent via our cookie
              banner. We currently use one category of non-essential cookies:
            </p>

            <h3>Analytics cookies</h3>
            <p>
              Analytics cookies help us understand how visitors use the site &mdash; which pages are
              popular, how long people stay, and where they come from. This data is aggregated and
              anonymised; it can&rsquo;t be used to identify you personally.
            </p>
            <p>
              If Google Analytics is enabled, it sets cookies such as <code>_ga</code> and{" "}
              <code>_ga_*</code> with a default lifetime of up to 2 years. We configure IP
              anonymisation and do not use this data for advertising.
            </p>
            <p>
              Analytics scripts are loaded only after you consent. If you don&rsquo;t consent, no
              analytics cookies are ever set.
            </p>

            <h2>4. Third-party cookies</h2>
            <p>
              When you click an affiliate link to Amazon, Amazon may set its own cookies on your
              device. These are governed by Amazon&rsquo;s Cookie Notice, not this policy. We have
              no control over Amazon&rsquo;s cookies.
            </p>

            <h2>5. How to manage your consent</h2>
            <p>
              When you first visit the site, a cookie banner gives you the choice to accept or
              decline non-essential cookies. You can change your choice at any time by clicking the
              &ldquo;Cookie settings&rdquo; link in the site footer. Withdrawing consent
              doesn&rsquo;t affect anything that happened before you withdrew it.
            </p>

            <h2>6. Browser-level controls</h2>
            <p>
              You can also control cookies directly in your browser. Most browsers let you block all
              cookies, delete existing cookies, or set preferences per site. Note that blocking
              essential cookies may break parts of the site. Here are links to cookie settings for
              common browsers:
            </p>
            <ul>
              <li>
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apple Safari
                </a>
              </li>
              <li>
                <a
                  href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge-168dab11-0753-043d-7c16-ede5947fc64d"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Microsoft Edge
                </a>
              </li>
            </ul>

            <h2>7. Changes to this policy</h2>
            <p>
              We may update this Cookie Policy when we add new features or change our analytics
              setup. The &ldquo;Last updated&rdquo; date at the top reflects the most recent
              revision.
            </p>

            <h2>8. More information</h2>
            <p>
              For questions about how we handle your data more broadly, see our{" "}
              <a href="/legal/privacy">Privacy Policy</a>. To contact us, see our{" "}
              <a href="/legal/notice">Legal Notice</a>.
            </p>
          </article>
        </Container>
      </section>
    </main>
  );
}
