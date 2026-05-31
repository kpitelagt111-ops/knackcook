import { Fraunces, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "../globals.css";

/**
 * Admin root layout (non-localized). Provides html/body for the /admin tree.
 *
 * Loads the same display/sans fonts as the public site so the shared design
 * tokens in `app/globals.css` (Fraunces display + Manrope sans, ember accent,
 * cream surfaces) render identically in the back-office.
 *
 * The auth guard lives in the nested `(dashboard)` group so `/admin/login`
 * is NOT guarded — otherwise the login page would redirect to itself in a loop.
 *
 * Theme: the same `localStorage.theme` bootstrap script as the public site
 * is injected to prevent FOUC, and `ThemeProvider` wires up the toggle.
 */

const sans = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-stack",
});

const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-stack",
  axes: ["SOFT", "WONK", "opsz"],
});

const NO_FLASH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;d.classList.remove('light','dark');if(t==='light'){d.classList.add('light')}else{d.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`;

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: pre-paint theme bootstrap to prevent FOUC
          dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
