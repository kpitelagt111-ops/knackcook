"use client";

import { useEffect, useRef } from "react";

const MAX_SCROLL_PX = 18;
const MAX_POINTER_PX = 10;

export function HeroParallax({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax-depth]")).map(
      (el) => {
        const depth = Number(el.dataset.parallaxDepth ?? "0.4");
        return { el, depth: Number.isFinite(depth) ? depth : 0.4 };
      },
    );
    if (layers.length === 0) return;

    let scrollY = 0;
    let pointerX = 0;
    let pointerY = 0;
    let rafId = 0;
    let ticking = false;
    let originTop = root.getBoundingClientRect().top + window.scrollY;

    const apply = () => {
      ticking = false;
      const localScroll = window.scrollY - originTop;
      for (const { el, depth } of layers) {
        const sy = Math.max(-1, Math.min(1, localScroll / 500)) * MAX_SCROLL_PX * depth;
        const px = pointerX * MAX_POINTER_PX * depth;
        const py = pointerY * MAX_POINTER_PX * depth;
        el.style.transform = `translate3d(${px.toFixed(2)}px, ${(sy + py).toFixed(2)}px, 0)`;
      }
    };

    const schedule = () => {
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(apply);
    };

    const onScroll = () => {
      scrollY = window.scrollY;
      void scrollY;
      schedule();
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      pointerX = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
      pointerY = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
      schedule();
    };
    const onPointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
      schedule();
    };
    const onResize = () => {
      originTop = root.getBoundingClientRect().top + window.scrollY;
      schedule();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onPointerLeave);

    apply();

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      for (const { el } of layers) {
        el.style.transform = "";
      }
    };
  }, []);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
