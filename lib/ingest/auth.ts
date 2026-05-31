/**
 * Bearer-token auth for the ingestion API (n8n → site). REQ-I-01.
 * Constant-time-ish comparison to avoid trivial timing leaks.
 */
export function isAuthorizedIngest(authHeader: string | null): boolean {
  const secret = process.env.INGEST_API_KEY;
  if (!secret) return false;
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length).trim();
  if (token.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return mismatch === 0;
}
