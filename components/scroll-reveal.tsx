"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

const REVEAL_SELECTOR = "[data-reveal]:not(.is-visible)";

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    void pathname;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const markVisible = (el: Element) => {
      el.classList.add("is-visible");
    };

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      for (const el of document.querySelectorAll(REVEAL_SELECTOR)) {
        markVisible(el);
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            markVisible(entry.target);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    const scan = () => {
      for (const el of document.querySelectorAll(REVEAL_SELECTOR)) {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          markVisible(el);
        } else {
          observer.observe(el);
        }
      }
    };

    scan();

    const raf = window.requestAnimationFrame(scan);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
