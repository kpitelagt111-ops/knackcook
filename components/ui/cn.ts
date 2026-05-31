/**
 * Tiny class-name joiner. No deps. Filters out falsy values so callers can
 * pass conditional class strings inline.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  let out = "";
  for (const c of classes) {
    if (!c && c !== 0) continue;
    if (out.length > 0) out += " ";
    out += String(c);
  }
  return out;
}
