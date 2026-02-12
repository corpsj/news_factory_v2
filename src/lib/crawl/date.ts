export function parseKoreanDate(input: string | null | undefined, fallback = new Date()): string {
  const raw = (input ?? "").trim();
  if (!raw) {
    return fallback.toISOString();
  }

  const normalized = raw.replace(/\s+/g, " ");
  const match = normalized.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const value = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    if (!Number.isNaN(value.getTime())) {
      return value.toISOString();
    }
  }

  const fallbackDate = new Date(normalized);
  if (!Number.isNaN(fallbackDate.getTime())) {
    return fallbackDate.toISOString();
  }

  return fallback.toISOString();
}
