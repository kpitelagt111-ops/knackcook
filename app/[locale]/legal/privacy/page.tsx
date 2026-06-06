import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Privacy Policy", alternates: { canonical: "/legal/privacy" } };
}

export default async function PrivacyPolicyPage({
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
            title="Privacy Policy"
            kicker="What we collect, why, and your rights under GDPR."
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
              This Privacy Policy explains how KnackCook (knackcook.com) collects, uses, and
              protects your personal data. We take your privacy seriously and comply with the
              General Data Protection Regulation (GDPR) and other applicable data protection laws.
            </p>

            <h2>1. Who we are</h2>
            <p>
              KnackCook is operated by the entity identified on our{" "}
              <a href="/legal/notice">Legal Notice</a> page. That page contains our full contact
              details and serves as the data controller contact for GDPR purposes.
            </p>

            <h2>2. What data we collect</h2>

            <h3>Anonymous analytics</h3>
            <p>
              If you consent to analytics cookies, we collect anonymised usage data such as pages
              visited, time on page, and referral source. This data cannot be used to identify you
              personally. Analytics are loaded only after you give consent &mdash; never before.
            </p>

            <h3>Click tracking</h3>
            <p>
              When you click an affiliate link, our server logs the following for fraud prevention
              and reporting purposes: the product identifier (ASIN), your locale, a truncated
              User-Agent string, and a flag indicating whether the request appears to come from a
              bot. We do not log your full IP address. This data is retained for 90 days and then
              deleted.
            </p>

            <h3>Newsletter subscription</h3>
            <p>
              If you subscribe to our newsletter, we collect your email address. We use a double
              opt-in process: you&rsquo;ll receive a confirmation email and your subscription is
              only activated after you click the confirmation link. We use your email solely to send
              the newsletter. We never sell or share it with third parties for marketing purposes.
            </p>

            <h3>Data you don&rsquo;t provide</h3>
            <p>
              We don&rsquo;t require you to create an account to use this site. We don&rsquo;t
              collect names, addresses, payment details, or any other sensitive personal data.
            </p>

            <h2>3. Cookies</h2>
            <p>
              We use cookies for essential site functionality and, with your consent, for analytics.
              See our <a href="/legal/cookies">Cookie Policy</a> for full details.
            </p>

            <h2>4. Third parties</h2>

            <h3>Amazon</h3>
            <p>
              This site contains affiliate links to Amazon. When you click through to Amazon, you
              are subject to Amazon&rsquo;s own privacy policy. Amazon may set cookies on your
              device. We have no control over Amazon&rsquo;s data practices.
            </p>

            <h3>Google Analytics</h3>
            <p>
              If you consent to analytics cookies and Google Analytics is enabled, your anonymised
              browsing data is sent to Google LLC. Google may process this data in the United
              States. We use IP anonymisation and do not share data with Google for advertising
              purposes. You can opt out at any time by withdrawing your analytics consent via our
              cookie banner.
            </p>

            <h2>5. Legal basis for processing</h2>
            <p>We process your data on the following legal bases under GDPR Article 6:</p>
            <ul>
              <li>
                <strong>Consent (Art. 6(1)(a)):</strong> analytics cookies, newsletter subscription.
              </li>
              <li>
                <strong>Legitimate interests (Art. 6(1)(f)):</strong> click tracking for fraud
                prevention and affiliate reporting, where our interests are not overridden by your
                rights.
              </li>
            </ul>

            <h2>6. Data retention</h2>
            <p>
              Click tracking logs are deleted after 90 days. Newsletter email addresses are retained
              until you unsubscribe. Analytics data is retained according to the retention settings
              configured in our analytics platform (typically 14 months).
            </p>

            <h2>7. Your rights</h2>
            <p>Under GDPR, you have the right to:</p>
            <ul>
              <li>
                <strong>Access</strong> the personal data we hold about you.
              </li>
              <li>
                <strong>Rectification</strong> of inaccurate data.
              </li>
              <li>
                <strong>Erasure</strong> (&ldquo;right to be forgotten&rdquo;) of your data.
              </li>
              <li>
                <strong>Restriction</strong> of processing in certain circumstances.
              </li>
              <li>
                <strong>Data portability</strong> where processing is based on consent.
              </li>
              <li>
                <strong>Object</strong> to processing based on legitimate interests.
              </li>
              <li>
                <strong>Withdraw consent</strong> at any time without affecting the lawfulness of
                prior processing.
              </li>
            </ul>
            <p>
              To exercise any of these rights, contact us using the details on our{" "}
              <a href="/legal/notice">Legal Notice</a> page. We&rsquo;ll respond within 30 days.
            </p>
            <p>
              You also have the right to lodge a complaint with your local data protection
              authority.
            </p>

            <h2>8. Security</h2>
            <p>
              We use HTTPS throughout the site. Access to server logs is restricted to authorised
              personnel. We don&rsquo;t store payment data.
            </p>

            <h2>9. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at
              the top of this page will reflect any changes. Continued use of the site after an
              update constitutes acceptance of the revised policy.
            </p>

            <h2>10. Contact</h2>
            <p>
              For any privacy-related questions or to exercise your rights, contact us at the
              address listed on our <a href="/legal/notice">Legal Notice</a> page.
            </p>
          </article>
        </Container>
      </section>
    </main>
  );
}
