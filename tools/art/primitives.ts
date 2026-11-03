// Shape helpers for code-generated pages (tools/shapes, tools/animals). Each returns an SVG element
// without its closing `/>`, so `LayeredPage` can add a label and style.

export type Pt = [number, number];

export const n = (v: number) => Math.round(v * 100) / 100;
const xy = ([x, y]: Pt) => `${n(x)},${n(y)}`;
export const pts = (p: Pt[]) => `M ${p.map(xy).join(' L ')} Z`;

export const circle = (cx: number, cy: number, r: number) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"`;
/** `rot` turns the ellipse clockwise by that many degrees about its centre. */
export const ellipse = (cx: number, cy: number, rx: number, ry: number, rot = 0) =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}"${rot ? ` transform="rotate(${rot} ${n(cx)} ${n(cy)})"` : ''}`;
export const rect = (x: number, y: number, w: number, h: number, r = 0) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${r ? ` rx="${n(r)}"` : ''}`;
export const poly = (p: Pt[]) => `<path d="${pts(p)}"`;

/** Polygon with corners rounded by `r` (quadratic curve through each corner). */
export const roundPoly = (p: Pt[], r: number) => {
  const toward = (from: Pt, to: Pt): Pt => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const k = Math.min(r, len / 2) / len;
    return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
  };
  const d = p
    .map((cur, i) => {
      const a = toward(cur, p[(i - 1 + p.length) % p.length]!);
      const b = toward(cur, p[(i + 1) % p.length]!);
      return `${i === 0 ? 'M' : 'L'} ${xy(a)} Q ${xy(cur)} ${xy(b)}`;
    })
    .join(' ');
  return `<path d="${d} Z"`;
};

/** Regular polygon; `startDeg` is the angle of the first corner (-90 points up). */
export const regular = (sides: number, cx: number, cy: number, r: number, startDeg: number) =>
  poly(Array.from({ length: sides }, (_, i) => {
    const a = ((startDeg + (360 / sides) * i) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
  }));
export const triangle = (cx: number, cy: number, r: number) => regular(3, cx, cy, r, -90);
export const star = (cx: number, cy: number, r: number) =>
  poly(Array.from({ length: 10 }, (_, i) => {
    const a = ((-90 + 36 * i) * Math.PI) / 180;
    const k = i % 2 === 0 ? r : r * 0.48;
    return [cx + k * Math.cos(a), cy + k * Math.sin(a)] as Pt;
  }));
/** `s` is the overall width and height. */
export const heart = (cx: number, cy: number, s: number) => {
  const p = (x: number, y: number) => `${n(cx + x * s)},${n(cy + y * s)}`;
  return `<path d="M ${p(0, -0.28)} C ${p(0.16, -0.54)} ${p(0.5, -0.5)} ${p(0.5, -0.18)} C ${p(0.5, 0.12)} ${p(0.18, 0.3)} ${p(0, 0.5)} C ${p(-0.18, 0.3)} ${p(-0.5, 0.12)} ${p(-0.5, -0.18)} C ${p(-0.5, -0.5)} ${p(-0.16, -0.54)} ${p(0, -0.28)} Z"`;
};
export const diamond = (cx: number, cy: number, rx: number, ry: number) => poly([[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]]);
/** Dome on a flat base centred at (cx, baseY); `down` hangs it below the base. `ry` defaults to a half circle. */
export const halfCircle = (cx: number, baseY: number, r: number, down = false, ry = r) =>
  `<path d="M ${n(cx - r)},${n(baseY)} A ${n(r)} ${n(ry)} 0 0 ${down ? 0 : 1} ${n(cx + r)},${n(baseY)} Z"`;
/** Moon opening to the right: an outer arc around the left, an inner arc back. */
export const crescent = (cx: number, cy: number, r: number) => {
  const a = (55 * Math.PI) / 180;
  const top: Pt = [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const bottom: Pt = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const inner = r * 0.9;
  return `<path d="M ${n(top[0])},${n(top[1])} A ${n(r)} ${n(r)} 0 1 0 ${n(bottom[0])},${n(bottom[1])} A ${n(inner)} ${n(inner)} 0 0 1 ${n(top[0])},${n(top[1])} Z"`;
};
export const trapezoid = (cx: number, cy: number, top: number, bottom: number, h: number) =>
  poly([[cx - top / 2, cy - h / 2], [cx + top / 2, cy - h / 2], [cx + bottom / 2, cy + h / 2], [cx - bottom / 2, cy + h / 2]]);

/** Fluffy outline (wool, a mane, a cloud): `count` bumps around an ellipse. */
export const scallop = (cx: number, cy: number, rx: number, ry: number, count: number, startDeg = -90) => {
  const p = Array.from({ length: count }, (_, i) => {
    const a = ((startDeg + (360 / count) * i) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as Pt;
  });
  const arcs = p.map((cur, i) => {
    const next = p[(i + 1) % count]!;
    const r = Math.hypot(next[0] - cur[0], next[1] - cur[1]) * 0.62;
    return `A ${n(r)} ${n(r)} 0 0 1 ${xy(next)}`;
  });
  return `<path d="M ${xy(p[0]!)} ${arcs.join(' ')} Z"`;
};

/** The part of an ellipse between x1 and x2 (a stripe across a bee). */
export const band = (cx: number, cy: number, rx: number, ry: number, x1: number, x2: number) => {
  const dy = (x: number) => ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
  return `<path d="M ${n(x1)},${n(cy - dy(x1))} A ${n(rx)} ${n(ry)} 0 0 1 ${n(x2)},${n(cy - dy(x2))} L ${n(x2)},${n(cy + dy(x2))} A ${n(rx)} ${n(ry)} 0 0 1 ${n(x1)},${n(cy + dy(x1))} Z"`;
};

/** Puffy cloud about 270 × 110 at scale 1, centred on (cx, cy). */
export const cloud = (cx: number, cy: number, s = 1) => {
  const base: Pt[] = [[700, 170], [664, 170], [660, 124], [700, 116], [706, 76], [768, 68], [790, 97], [818, 62], [886, 74], [890, 116], [930, 118], [932, 170], [896, 170]];
  const p = base.map(([x, y]) => xy([cx + (x - 796) * s, cy + (y - 120) * s]));
  return `<path d="M ${p[0]} C ${p[1]} ${p[2]} ${p[3]} C ${p[4]} ${p[5]} ${p[6]} C ${p[7]} ${p[8]} ${p[9]} C ${p[10]} ${p[11]} ${p[12]} Z"`;
};
