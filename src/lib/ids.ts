export function genExternalId(prefix = "WI"): string {
  // short, URL-safe, human-ish id: WI-8char
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${rand}`;
}
