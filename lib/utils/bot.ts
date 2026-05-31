/** Cheap heuristic bot detection from the User-Agent (REQ-T-02). */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|curl|wget|python-requests|headless|lighthouse|pingdom|uptime/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return true; // no UA → treat as bot
  return BOT_PATTERN.test(ua);
}
