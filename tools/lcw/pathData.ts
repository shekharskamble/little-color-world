// Converts SVG shapes to path data and bakes transforms into it, so imported
// pages contain only absolute M/L/C/Q/Z commands in page units.

import { parsePath, type Point, type Segment } from '../../src/engine/geometry/path';

import { apply, type Matrix } from './matrix';

type Attr = (name: string) => number;

/** Path data for a basic shape element, or null for unsupported tags. */
export function shapeToPathData(tag: string, attr: Attr, rawD: string | null): string | null {
  switch (tag) {
    case 'path':
      return rawD;
    case 'rect': {
      const [x, y, w, h] = [attr('x'), attr('y'), attr('width'), attr('height')];
      let rx = attr('rx');
      let ry = attr('ry');
      if (!rx && ry) rx = ry;
      if (!ry && rx) ry = rx;
      rx = Math.min(rx, w / 2);
      ry = Math.min(ry, h / 2);
      if (!rx) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return (
        `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}` +
        `A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}` +
        `V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`
      );
    }
    case 'circle':
    case 'ellipse': {
      const [cx, cy] = [attr('cx'), attr('cy')];
      const rx = tag === 'circle' ? attr('r') : attr('rx');
      const ry = tag === 'circle' ? attr('r') : attr('ry');
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 1 ${cx + rx} ${cy}A${rx} ${ry} 0 1 1 ${cx - rx} ${cy}Z`;
    }
    case 'line':
      return `M${attr('x1')} ${attr('y1')}L${attr('x2')} ${attr('y2')}`;
    default:
      return null;
  }
}

/** Path data for `<polygon>` / `<polyline>` points. */
export function pointsToPathData(points: string, closed: boolean): string {
  const n = points.trim().split(/[\s,]+/).filter(Boolean).map(Number);
  if (n.length < 4 || n.length % 2 !== 0 || n.some((v) => !Number.isFinite(v))) throw new Error(`Bad points: ${points}`);
  let d = `M${n[0]} ${n[1]}`;
  for (let i = 2; i < n.length; i += 2) d += `L${n[i]} ${n[i + 1]}`;
  return closed ? `${d}Z` : d;
}

/** Applies `m` to every point and serializes with 2-decimal precision. */
export function transformPathData(d: string, m: Matrix): string {
  return serialize(parsePath(d).map((s) => mapSegment(s, (p) => apply(m, p))));
}

function mapSegment(s: Segment, f: (p: Point) => Point): Segment {
  switch (s.type) {
    case 'M':
    case 'L':
      return { type: s.type, p: f(s.p) };
    case 'C':
      return { type: 'C', c1: f(s.c1), c2: f(s.c2), p: f(s.p) };
    case 'Q':
      return { type: 'Q', c: f(s.c), p: f(s.p) };
    case 'Z':
      return s;
  }
}

function serialize(segments: Segment[]): string {
  const pt = (p: Point) => `${num(p.x)} ${num(p.y)}`;
  return segments
    .map((s) => {
      switch (s.type) {
        case 'M':
        case 'L':
          return `${s.type}${pt(s.p)}`;
        case 'C':
          return `C${pt(s.c1)} ${pt(s.c2)} ${pt(s.p)}`;
        case 'Q':
          return `Q${pt(s.c)} ${pt(s.p)}`;
        case 'Z':
          return 'Z';
      }
    })
    .join(' ');
}

function num(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
}
