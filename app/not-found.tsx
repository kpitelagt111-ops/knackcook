/**
 * Global 404 — used when the locale segment itself is unknown, so no
 * NextIntl provider is available and we render plain HTML with inline
 * styles that mirror the public design tokens.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fbf8f3",
          color: "#261c14",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "32rem" }}>
          <span
            style={{
              display: "inline-block",
              fontSize: "0.7rem",
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#b54514",
            }}
          >
            404 · Off the menu
          </span>
          <h1
            style={{
              marginTop: "1.5rem",
              fontSize: "clamp(2.5rem, 7vw, 4rem)",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              fontFamily: "Georgia, 'Times New Roman', serif",
              lineHeight: 1.05,
            }}
          >
            This page is not on the recipe card.
          </h1>
          <p
            style={{
              marginTop: "1rem",
              color: "#6c5742",
              lineHeight: 1.6,
            }}
          >
            We couldn&rsquo;t find what you were looking for. Maybe the page moved, maybe the link
            is stale.
          </p>
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "2rem",
              padding: "0.75rem 1.75rem",
              borderRadius: "0.75rem",
              backgroundColor: "#d85a1d",
              color: "#fff7ee",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Back to home
          </a>
        </div>
      </body>
    </html>
  );
}
