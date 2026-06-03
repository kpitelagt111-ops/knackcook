"use client";

import { useEffect, useRef, useState } from "react";
import { Button, type ButtonProps } from "./button";
import { cn } from "./cn";

/**
 * A button that opens a Yes/No confirmation modal before submitting the
 * closest enclosing <form>. Place it INSIDE a `<form action={serverAction}>`
 * where a `<Button type="submit">` would otherwise live.
 *
 * Once the user confirms, the component calls `form.requestSubmit()` which
 * triggers the server action exactly as a native submit would. Cancel /
 * Escape / backdrop click closes the modal without submitting.
 *
 * Accessibility: role="dialog" + aria-modal, focus moves to the confirm
 * button on open, body scroll is locked while open, Escape closes.
 */
export interface ConfirmButtonProps extends Omit<ButtonProps, "type" | "onClick"> {
  /** Headline shown in the dialog (e.g. "Delete this article?"). */
  confirmTitle?: string;
  /** Body message inside the dialog (e.g. "This cannot be undone."). */
  confirmMessage: string;
  /** Confirm button label. Defaults to "Yes". */
  confirmLabel?: string;
  /** Cancel button label. Defaults to "No". */
  cancelLabel?: string;
  /** Visual tone of the confirm action — danger styles the confirm in red. */
  confirmTone?: "danger" | "primary";
}

export function ConfirmButton({
  children,
  confirmTitle = "Are you sure?",
  confirmMessage,
  confirmLabel = "Yes",
  cancelLabel = "No",
  confirmTone = "danger",
  className,
  disabled,
  ...buttonProps
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Defer focus so the dialog is in the DOM
    const id = window.setTimeout(() => confirmRef.current?.focus(), 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [open]);

  function handleConfirm() {
    setOpen(false);
    const form = triggerRef.current?.closest("form");
    if (form) form.requestSubmit();
  }

  const confirmClass =
    confirmTone === "danger"
      ? "bg-danger-600 hover:bg-danger-700 text-cream-50 dark:bg-danger-600 dark:hover:bg-danger-500 shadow-soft"
      : undefined;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        disabled={disabled}
        {...buttonProps}
      >
        {children}
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-button-title"
          aria-describedby="confirm-button-message"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label={cancelLabel}
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-cocoa-900/60 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h2
              id="confirm-button-title"
              className="font-display text-xl font-medium tracking-tight text-foreground"
            >
              {confirmTitle}
            </h2>
            <p id="confirm-button-message" className="mt-2 text-sm leading-relaxed text-muted">
              {confirmMessage}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="md" onClick={() => setOpen(false)}>
                {cancelLabel}
              </Button>
              <Button
                ref={confirmRef}
                type="button"
                variant="primary"
                size="md"
                onClick={handleConfirm}
                className={cn(confirmClass)}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
