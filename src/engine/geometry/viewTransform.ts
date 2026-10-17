import type { Point } from './path';

/** Uniform scale + translation mapping page (viewBox) units to screen points. */
export type ViewTransform = { scale: number; tx: number; ty: number };

/** Fits a page of `pageW × pageH` inside a `viewW × viewH` area, centered ("contain"). */
export function fitContain(pageW: number, pageH: number, viewW: number, viewH: number, padding = 0): ViewTransform {
  const availW = Math.max(1, viewW - padding * 2);
  const availH = Math.max(1, viewH - padding * 2);
  const scale = Math.min(availW / pageW, availH / pageH);
  return { scale, tx: (viewW - pageW * scale) / 2, ty: (viewH - pageH * scale) / 2 };
}

export function screenToPage(t: ViewTransform, p: Point): Point {
  return { x: (p.x - t.tx) / t.scale, y: (p.y - t.ty) / t.scale };
}

export function pageToScreen(t: ViewTransform, p: Point): Point {
  return { x: p.x * t.scale + t.tx, y: p.y * t.scale + t.ty };
}
