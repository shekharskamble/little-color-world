/** Darkens a `#RRGGBB` color by `amount` (0–1). Used to derive Toy Box lips from arbitrary tints. */
export function shade(hex: string, amount: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const k = 1 - Math.min(Math.max(amount, 0), 1);
  const channel = (shift: number) => Math.round(((n >> shift) & 0xff) * k);
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}
