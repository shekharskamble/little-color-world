// SVG path data parsing and flattening.
// Supports the full path grammar (M L H V C S Q T A Z, absolute and relative).
// Output is absolute geometry; curves are flattened to polylines for hit testing
// and validation. Rendering uses Skia's own parser on the same `d` string.

export type Point = { x: number; y: number };

export type Segment =
  | { type: 'M'; p: Point }
  | { type: 'L'; p: Point }
  | { type: 'C'; c1: Point; c2: Point; p: Point }
  | { type: 'Q'; c: Point; p: Point }
  | { type: 'Z' };

export type Subpath = { points: Point[]; closed: boolean };

export class PathParseError extends Error {
  constructor(message: string, readonly index: number) {
    super(`${message} at index ${index}`);
    this.name = 'PathParseError';
  }
}

const NUMBER_RE = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y;
const SEPARATOR_RE = /[\s,]/;
const COMMAND_RE = /[MmLlHhVvCcSsQqTtAaZz]/;

class Scanner {
  i = 0;
  constructor(private readonly s: string) {}

  private skip(): void {
    while (this.i < this.s.length && SEPARATOR_RE.test(this.s[this.i]!)) this.i++;
  }

  atEnd(): boolean {
    this.skip();
    return this.i >= this.s.length;
  }

  command(): string {
    this.skip();
    const c = this.s[this.i];
    if (c === undefined || !COMMAND_RE.test(c)) throw new PathParseError(`Expected command, got "${c ?? 'end'}"`, this.i);
    this.i++;
    return c;
  }

  hasNumber(): boolean {
    this.skip();
    const c = this.s[this.i];
    return c !== undefined && /[-+.\d]/.test(c);
  }

  number(): number {
    this.skip();
    NUMBER_RE.lastIndex = this.i;
    const m = NUMBER_RE.exec(this.s);
    if (!m) throw new PathParseError('Expected number', this.i);
    this.i += m[0].length;
    const n = Number(m[0]);
    if (!Number.isFinite(n)) throw new PathParseError('Non-finite number', this.i);
    return n;
  }

  // Arc flags may be written without separators ("a10 10 0 01 20 20").
  flag(): boolean {
    this.skip();
    const c = this.s[this.i];
    if (c !== '0' && c !== '1') throw new PathParseError('Expected arc flag', this.i);
    this.i++;
    return c === '1';
  }
}

/** Parses SVG path data into absolute segments (arcs converted to cubics, H/V/S/T expanded). */
export function parsePath(d: string): Segment[] {
  const s = new Scanner(d);
  const out: Segment[] = [];
  let cur: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  // Last control point, for S/T reflection.
  let lastCubicCtrl: Point | null = null;
  let lastQuadCtrl: Point | null = null;

  if (s.atEnd()) return out;

  while (!s.atEnd()) {
    const cmd = s.command();
    const rel = cmd === cmd.toLowerCase();
    const upper = cmd.toUpperCase();
    const pt = (x: number, y: number): Point => (rel ? { x: cur.x + x, y: cur.y + y } : { x, y });

    if (upper === 'Z') {
      out.push({ type: 'Z' });
      cur = start;
      lastCubicCtrl = lastQuadCtrl = null;
      continue;
    }

    let first = true;
    do {
      let nextCubic: Point | null = null;
      let nextQuad: Point | null = null;
      switch (upper) {
        case 'M': {
          const p = pt(s.number(), s.number());
          // Subsequent pairs after M are implicit L commands.
          out.push(first ? { type: 'M', p } : { type: 'L', p });
          if (first) start = p;
          cur = p;
          break;
        }
        case 'L': {
          cur = pt(s.number(), s.number());
          out.push({ type: 'L', p: cur });
          break;
        }
        case 'H': {
          const x = s.number();
          cur = { x: rel ? cur.x + x : x, y: cur.y };
          out.push({ type: 'L', p: cur });
          break;
        }
        case 'V': {
          const y = s.number();
          cur = { x: cur.x, y: rel ? cur.y + y : y };
          out.push({ type: 'L', p: cur });
          break;
        }
        case 'C': {
          const c1 = pt(s.number(), s.number());
          const c2 = pt(s.number(), s.number());
          const p = pt(s.number(), s.number());
          out.push({ type: 'C', c1, c2, p });
          nextCubic = c2;
          cur = p;
          break;
        }
        case 'S': {
          const c1: Point = lastCubicCtrl ? reflect(lastCubicCtrl, cur) : cur;
          const c2 = pt(s.number(), s.number());
          const p = pt(s.number(), s.number());
          out.push({ type: 'C', c1, c2, p });
          nextCubic = c2;
          cur = p;
          break;
        }
        case 'Q': {
          const c = pt(s.number(), s.number());
          const p = pt(s.number(), s.number());
          out.push({ type: 'Q', c, p });
          nextQuad = c;
          cur = p;
          break;
        }
        case 'T': {
          const c: Point = lastQuadCtrl ? reflect(lastQuadCtrl, cur) : cur;
          const p = pt(s.number(), s.number());
          out.push({ type: 'Q', c, p });
          nextQuad = c;
          cur = p;
          break;
        }
        case 'A': {
          const rx = s.number();
          const ry = s.number();
          const rotation = s.number();
          const largeArc = s.flag();
          const sweep = s.flag();
          const p = pt(s.number(), s.number());
          for (const c of arcToCubics(cur, rx, ry, rotation, largeArc, sweep, p)) out.push(c);
          cur = p;
          break;
        }
      }
      lastCubicCtrl = nextCubic;
      lastQuadCtrl = nextQuad;
      first = false;
    } while (s.hasNumber());
  }

  if (out.length > 0 && out[0]!.type !== 'M') throw new PathParseError('Path must start with M', 0);
  return out;
}

function reflect(ctrl: Point, about: Point): Point {
  return { x: 2 * about.x - ctrl.x, y: 2 * about.y - ctrl.y };
}

/** SVG arc → cubic béziers (SVG 1.1 implementation notes, F.6.5). */
function arcToCubics(
  p0: Point,
  rxIn: number,
  ryIn: number,
  rotationDeg: number,
  largeArc: boolean,
  sweep: boolean,
  p: Point,
): Segment[] {
  if (p0.x === p.x && p0.y === p.y) return [];
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) return [{ type: 'L', p }];

  const phi = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (p0.x - p.x) / 2;
  const dy = (p0.y - p.y) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const k = Math.sqrt(lambda);
    rx *= k;
    ry *= k;
  }

  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = (largeArc !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (p0.x + p.x) / 2;
  const cy = sin * cxp + cos * cyp + (p0.y + p.y) / 2;

  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;
  const theta1 = Math.atan2(uy, ux);
  let dTheta = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI;
  if (sweep && dTheta < 0) dTheta += 2 * Math.PI;

  const count = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2) - 1e-9));
  const delta = dTheta / count;
  const t = (4 / 3) * Math.tan(delta / 4);

  const at = (a: number): Point => ({
    x: cx + rx * Math.cos(a) * cos - ry * Math.sin(a) * sin,
    y: cy + rx * Math.cos(a) * sin + ry * Math.sin(a) * cos,
  });
  const deriv = (a: number): Point => ({
    x: -rx * Math.sin(a) * cos - ry * Math.cos(a) * sin,
    y: -rx * Math.sin(a) * sin + ry * Math.cos(a) * cos,
  });

  const segs: Segment[] = [];
  for (let i = 0; i < count; i++) {
    const a1 = theta1 + i * delta;
    const a2 = a1 + delta;
    const e1 = at(a1);
    const e2 = i === count - 1 ? p : at(a2);
    const d1 = deriv(a1);
    const d2 = deriv(a2);
    segs.push({
      type: 'C',
      c1: { x: e1.x + t * d1.x, y: e1.y + t * d1.y },
      c2: { x: e2.x - t * d2.x, y: e2.y - t * d2.y },
      p: e2,
    });
  }
  return segs;
}

/**
 * Flattens segments into polylines. `maxSegmentLength` bounds the chord length
 * of curve subdivisions, in path units.
 */
export function flattenSegments(segments: Segment[], maxSegmentLength = 6): Subpath[] {
  const subpaths: Subpath[] = [];
  let current: Subpath | null = null;
  let cur: Point = { x: 0, y: 0 };

  const ensure = (): Subpath => {
    if (!current) {
      current = { points: [cur], closed: false };
      subpaths.push(current);
    }
    return current;
  };

  for (const seg of segments) {
    switch (seg.type) {
      case 'M':
        current = { points: [seg.p], closed: false };
        subpaths.push(current);
        cur = seg.p;
        break;
      case 'L':
        ensure().points.push(seg.p);
        cur = seg.p;
        break;
      case 'C': {
        const sp = ensure();
        const n = subdivisions(dist(cur, seg.c1) + dist(seg.c1, seg.c2) + dist(seg.c2, seg.p), maxSegmentLength);
        for (let i = 1; i <= n; i++) sp.points.push(cubicAt(cur, seg.c1, seg.c2, seg.p, i / n));
        cur = seg.p;
        break;
      }
      case 'Q': {
        const sp = ensure();
        const n = subdivisions(dist(cur, seg.c) + dist(seg.c, seg.p), maxSegmentLength);
        for (let i = 1; i <= n; i++) sp.points.push(quadAt(cur, seg.c, seg.p, i / n));
        cur = seg.p;
        break;
      }
      case 'Z':
        if (current) {
          current.closed = true;
          cur = current.points[0]!;
          current = null;
        }
        break;
    }
  }
  return subpaths;
}

export function flattenPath(d: string, maxSegmentLength?: number): Subpath[] {
  return flattenSegments(parsePath(d), maxSegmentLength);
}

function subdivisions(approxLength: number, maxLen: number): number {
  return Math.min(128, Math.max(2, Math.ceil(approxLength / maxLen)));
}

function cubicAt(p0: Point, c1: Point, c2: Point, p: Point, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p.x, y: a * p0.y + b * c1.y + c * c2.y + d * p.y };
}

function quadAt(p0: Point, c: Point, p: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * c.x + t * t * p.x,
    y: mt * mt * p0.y + 2 * mt * t * c.y + t * t * p.y,
  };
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
