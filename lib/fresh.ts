export const FRESH_MS = 24 * 60 * 60 * 1000;

export function freshSince(now = new Date()) {
  return new Date(now.getTime() - FRESH_MS);
}

export function isFresh(value: Date | string | null | undefined, now = new Date()) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  return now.getTime() - date.getTime() < FRESH_MS && now.getTime() >= date.getTime();
}
