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

/** Fills a `viewW × viewH` area with the page, centered ("cover"); any overflow (a sliver at most) is cropped. */
export function fitCover(pageW: number, pageH: number, viewW: number, viewH: number): ViewTransform {
  const scale = Math.max(viewW / pageW, viewH / pageH);
  return { scale, tx: (viewW - pageW * scale) / 2, ty: (viewH - pageH * scale) / 2 };
}

/** Fits the page rectangle `rect` (x, y, width, height) inside the view, centered, with `padding` on every side. */
export function fitContainRect(rect: { x: number; y: number; width: number; height: number }, viewW: number, viewH: number, padding = 0): ViewTransform {
  const availW = Math.max(1, viewW - padding * 2);
  const availH = Math.max(1, viewH - padding * 2);
  const scale = Math.min(availW / Math.max(1, rect.width), availH / Math.max(1, rect.height));
  return { scale, tx: viewW / 2 - (rect.x + rect.width / 2) * scale, ty: viewH / 2 - (rect.y + rect.height / 2) * scale };
}

/** Scales a transform by `factor` about the view point (`cx`, `cy`), e.g. to enlarge a thumbnail around its centre. */
export function zoomAbout(t: ViewTransform, factor: number, cx: number, cy: number): ViewTransform {
  return { scale: t.scale * factor, tx: cx - (cx - t.tx) * factor, ty: cy - (cy - t.ty) * factor };
}

export function screenToPage(t: ViewTransform, p: Point): Point {
  return { x: (p.x - t.tx) / t.scale, y: (p.y - t.ty) / t.scale };
}

export function pageToScreen(t: ViewTransform, p: Point): Point {
  return { x: p.x * t.scale + t.tx, y: p.y * t.scale + t.ty };
}
