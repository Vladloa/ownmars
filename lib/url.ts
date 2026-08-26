export function faviconUrl(ownerUrl: string | null | undefined) {
  if (!ownerUrl) return null;
  try {
    const host = new URL(normalizeUrl(ownerUrl)).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return null;
  }
}

export function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidHttpUrl(raw: string) {
  try {
    const url = new URL(normalizeUrl(raw));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
