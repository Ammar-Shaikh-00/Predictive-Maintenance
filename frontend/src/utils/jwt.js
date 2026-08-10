/**
 * Returns JWT `exp` as milliseconds since epoch, or null if missing / invalid / opaque token.
 */
export function parseJwtExpiryMs(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (b64.length % 4)) % 4;
    const padded = b64 + "=".repeat(pad);
    const json = JSON.parse(atob(padded));
    if (typeof json.exp !== "number") return null;
    return json.exp * 1000;
  } catch {
    return null;
  }
}
