// Inkscape SVG ⇄ ColoringPage JSON (docs/ARTWORK_PIPELINE.md, "Authoring convention").
//
// Layers (Inkscape layers, matched by label or id, case-insensitive):
//   regions  closed shapes children can fill. Each needs a name (Object Properties
//            ID or Label). Shapes sharing a name, or inside a named group, become
//            one region. A stroke on a region shape also becomes outline.
//   details  locked decorations (pupils, spots) drawn with their own fill color.
//   outline  extra stroked lines (whiskers, smiles). Strokes only.
// Any other layer, hidden or not, is ignored, so a reference image can stay.

import { DOMParser } from '@xmldom/xmldom';

import { fillBaseColor } from '../../src/content/schema/fill';
import type { Issue } from '../../src/content/schema/validatePage';
import type { ColoringPage } from '../../src/content/schema/page';
import { flattenPath } from '../../src/engine/geometry/path';

import { IDENTITY, multiply, parseTransform, scaleFactor, type Matrix } from './matrix';
import { pointsToPathData, shapeToPathData, transformPathData } from './pathData';
import { toCover, visibleStroke } from './visibleStroke';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LAYERS = ['regions', 'details', 'outline'] as const;
type LayerName = (typeof LAYERS)[number];

const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line']);
const SKIPPED = new Set(['defs', 'metadata', 'title', 'desc']);
const REJECTED = new Set(['text', 'image', 'use', 'symbol', 'mask', 'clipPath', 'filter', 'pattern', 'foreignObject', 'style', 'script', 'tspan']);
/** Ids Inkscape generates on its own (path123, rect4-5); these are not names. */
const AUTO_ID = /^(path|rect|circle|ellipse|polygon|polyline|line|g|layer|use|text)[-_]?\d+(-\d+)*$/i;
const REGION_ID = /^[a-z][a-z0-9_-]{0,47}$/;

export const DEFAULT_OUTLINE_COLOR = '#1E1B2E';

export type PageMeta = { id: string; themeId: string; title: string; subtitle?: string; ageBand: ColoringPage['ageBand']; version: number };

type Style = { fill: string; stroke: string; strokeWidth: number; lineCap: string; lineJoin: string; fillRule: string };
/** SVG defaults, except caps and joins: round suits toddler outlines and matches the page schema. */
const ROOT_STYLE: Style = { fill: '#000000', stroke: 'none', strokeWidth: 1, lineCap: 'round', lineJoin: 'round', fillRule: 'nonzero' };

type Shape = { layer: LayerName; elementId: string; name: string | null; d: string; style: Style; strokeWidth: number };

type Ctx = { matrix: Matrix; style: Style; layer: LayerName | null; groupName: string | null };

export type ImportResult = { page: ColoringPage | null; issues: Issue[] };

export function importSvg(svgText: string, meta: PageMeta): ImportResult {
  const issues: Issue[] = [];
  const error = (path: string, message: string) => issues.push({ severity: 'error', path, message });
  const warn = (path: string, message: string) => issues.push({ severity: 'warning', path, message });

  const doc = new DOMParser({ errorHandler: { error: (m: string) => error('svg', m), fatalError: (m: string) => error('svg', m) } }).parseFromString(
    svgText,
    'image/svg+xml',
  );
  const root = doc.documentElement;
  if (!root || root.localName !== 'svg') return { page: null, issues: [...issues, { severity: 'error', path: 'svg', message: 'Not an SVG document' }] };

  const vb = (attr(root, 'viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n)) || vb[2]! <= 0 || vb[3]! <= 0) {
    error('svg', 'Missing or invalid viewBox (use the template: 1024×768 px)');
    return { page: null, issues };
  }
  const [minX, minY, width, height] = vb as [number, number, number, number];

  const shapes: Shape[] = [];
  const walk = (el: Element, ctx: Ctx) => {
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType !== 1) continue;
      const node = child as Element;
      if (node.namespaceURI !== SVG_NS || SKIPPED.has(node.localName)) continue;

      const declared = parseStyle(attr(node, 'style'));
      if ((declared.display ?? attr(node, 'display')) === 'none') continue;
      const elementId = attr(node, 'id') ?? `<${node.localName}>`;
      let matrix: Matrix;
      try {
        matrix = multiply(ctx.matrix, parseTransform(attr(node, 'transform')));
      } catch (e) {
        if (ctx.layer) error(elementId, String(e instanceof Error ? e.message : e));
        continue;
      }
      const style = inheritStyle(node, declared, ctx.style);
      const tag = node.localName;

      if (tag === 'g') {
        if (attr(node, 'inkscape:groupmode') === 'layer') {
          const label = (attr(node, 'inkscape:label') ?? attr(node, 'id') ?? '').trim().toLowerCase();
          const layer = (LAYERS as readonly string[]).includes(label) ? (label as LayerName) : null;
          if (layer) walk(node, { matrix, style, layer, groupName: null });
          else if (ctx.layer) walk(node, { ...ctx, matrix, style }); // sublayer of a known layer
          continue;
        }
        walk(node, { ...ctx, matrix, style, groupName: explicitName(node) ?? ctx.groupName });
        continue;
      }

      if (!ctx.layer) {
        if (SHAPES.has(tag)) warn(elementId, 'Shape outside the regions/details/outline layers is ignored');
        continue;
      }
      if (REJECTED.has(tag)) {
        error(elementId, `<${tag}> is not supported in coloring pages (convert to a path, or move it to another layer)`);
        continue;
      }
      if (!SHAPES.has(tag)) {
        error(elementId, `Unsupported element <${tag}>`);
        continue;
      }

      let d: string | null;
      try {
        d =
          tag === 'polygon' || tag === 'polyline'
            ? pointsToPathData(attr(node, 'points') ?? '', tag === 'polygon')
            : shapeToPathData(tag, (a) => Number(attr(node, a) ?? 0) || 0, attr(node, 'd'));
        if (!d) throw new Error('Empty shape');
        d = transformPathData(d, multiply([1, 0, 0, 1, -minX, -minY], matrix));
      } catch (e) {
        error(elementId, `Could not read shape: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
      shapes.push({
        layer: ctx.layer,
        elementId,
        name: explicitName(node) ?? ctx.groupName,
        d,
        style,
        strokeWidth: Math.round(style.strokeWidth * scaleFactor(matrix) * 2) / 2,
      });
    }
  };
  walk(root, { matrix: IDENTITY, style: ROOT_STYLE, layer: null, groupName: null });

  // Regions merge by name in first-seen order; details are appended above them.
  const regions = new Map<string, { id: string; parts: string[]; fillRule: string; locked: boolean; fill?: string; label?: string }>();
  const outlines = new Map<string, { d: string[]; strokeWidth: number; lineCap: string; lineJoin: string }>();
  /** Shapes in the order they paint, so each stroke can be trimmed where later shapes cover it. */
  const placed: { shape: Shape; regionId: string | null; docIndex: number }[] = [];
  let detailCount = 0;

  for (const [docIndex, s] of shapes.entries()) {
    let regionId: string | null = null;
    const hasStroke = s.style.stroke !== 'none' && s.strokeWidth > 0;
    if (s.layer === 'outline') {
      if (!hasStroke) warn(s.elementId, 'Shape in the outline layer has no stroke (outlines must be strokes, not filled shapes) and is ignored');
      else if (s.style.fill !== 'none') warn(s.elementId, 'Fill on an outline shape is ignored; only the stroke is used');
    } else {
      const locked = s.layer === 'details';
      const rawName = s.name ?? (locked ? `detail-${++detailCount}` : null);
      if (!rawName) {
        error(s.elementId, 'Region shape has no name: set its ID or Label in Object > Object Properties (e.g. "body", "ear-left")');
        continue;
      }
      const id = toRegionId(rawName);
      if (!REGION_ID.test(id)) {
        error(s.elementId, `Name "${rawName}" must start with a letter and use only a–z, 0–9, "-" or "_"`);
        continue;
      }
      const fill = locked ? toHex(s.style.fill) : undefined;
      if (locked && !fill) {
        error(s.elementId, 'Detail shapes need a solid hex fill color');
        continue;
      }
      const existing = regions.get(id);
      if (existing) {
        if (existing.locked !== locked) error(s.elementId, `"${id}" is used in both the regions and details layers`);
        else existing.parts.push(s.d);
      } else {
        regions.set(id, { id, parts: [s.d], fillRule: s.style.fillRule, locked, fill, label: rawName !== id ? rawName : undefined });
      }
      regionId = id;
    }
    if (hasStroke || regionId) placed.push({ shape: s, regionId, docIndex });
  }

  // A region's parts are filled together with the nonzero rule, so two parts traced in opposite directions cancel
  // where they overlap and leave an unfillable hole.
  for (const r of regions.values()) {
    if (r.parts.length < 2 || r.fillRule === 'evenodd') continue;
    const signs = new Set(r.parts.map((d) => Math.sign(signedArea(d))));
    if (signs.has(1) && signs.has(-1)) {
      warn(r.id, `Parts of "${r.id}" are drawn in opposite directions, so where they overlap the fill leaves a hole. Reverse one (Path > Reverse in Inkscape)`);
    }
  }
  const ordered = [...regions.values()].sort((a, b) => Number(a.locked) - Number(b.locked));
  if (!issues.some((i) => i.severity === 'error')) {
    const rank = new Map(ordered.map((r, i) => [r.id, i]));
    const covers = placed
      .filter((p) => p.regionId !== null)
      .map((p) => ({ rank: rank.get(p.regionId!)!, docIndex: p.docIndex, cover: toCover(p.shape.d, p.shape.style.fillRule === 'evenodd' ? 'evenodd' : 'nonzero') }));
    for (const { shape: s, regionId, docIndex } of placed) {
      if (s.style.stroke === 'none' || s.strokeWidth <= 0) continue;
      // Outline-layer strokes are drawn on purpose and stay whole; region and detail strokes lose their covered parts.
      // Parts of the same region cover each other both ways, so a region built from several shapes gets one outline
      // around the outside and no seams inside.
      let d: string | null = s.d;
      if (regionId !== null) {
        const r = rank.get(regionId)!;
        d = visibleStroke(
          s.d,
          covers.filter((c) => c.rank > r || (c.rank === r && c.docIndex !== docIndex)).map((c) => c.cover),
        );
      }
      if (d === null) continue;
      const lineCap = ['round', 'butt', 'square'].includes(s.style.lineCap) ? s.style.lineCap : 'round';
      const lineJoin = ['round', 'miter', 'bevel'].includes(s.style.lineJoin) ? s.style.lineJoin : 'round';
      const key = `${s.strokeWidth}|${lineCap}|${lineJoin}`;
      const group = outlines.get(key) ?? { d: [], strokeWidth: s.strokeWidth, lineCap, lineJoin };
      group.d.push(d);
      outlines.set(key, group);
    }
  }
  if (ordered.length === 0) error('regions', 'No regions found: draw closed, named shapes on the "regions" layer');
  // Clipart with no scene draws its lines as a locked region instead of outline strokes.
  if (outlines.size === 0 && !ordered.some((r) => r.locked)) error('outline', 'No outlines found: give region shapes a dark stroke, or draw strokes on the "outline" layer');
  if (issues.some((i) => i.severity === 'error')) return { page: null, issues };

  const page: ColoringPage = {
    schemaVersion: 1,
    id: meta.id,
    version: meta.version,
    themeId: meta.themeId,
    title: meta.title,
    ...(meta.subtitle ? { subtitle: meta.subtitle } : {}),
    ageBand: meta.ageBand,
    viewBox: [0, 0, width, height],
    background: '#FFFFFF',
    outlineColor: DEFAULT_OUTLINE_COLOR,
    regions: ordered.map((r) => ({
      id: r.id,
      d: r.parts.join(' '),
      fillRule: r.fillRule === 'evenodd' ? 'evenodd' : 'nonzero',
      locked: r.locked,
      ...(!r.locked && r.id.startsWith('small-') ? { small: true } : {}),
      ...(r.fill ? { defaultFill: { type: 'solid' as const, color: r.fill } } : {}),
      ...(r.label ? { label: r.label } : {}),
    })),
    outline: [...outlines.values()].map((o) => ({
      d: o.d.join(' '),
      strokeWidth: o.strokeWidth,
      lineCap: o.lineCap as 'round' | 'butt' | 'square',
      lineJoin: o.lineJoin as 'round' | 'miter' | 'bevel',
    })),
  };
  return { page, issues };
}

/** Writes a page as an Inkscape SVG using the same layer convention, for editing existing pages. */
export function exportSvg(page: ColoringPage): string {
  const [, , w, h] = page.viewBox;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const region = (r: ColoringPage['regions'][number]) => {
    const fill = (r.defaultFill && fillBaseColor(r.defaultFill)) ?? '#FFFFFF';
    const rule = r.fillRule === 'evenodd' ? ';fill-rule:evenodd' : '';
    return `    <path id="${r.id}" inkscape:label="${esc(r.label ?? r.id)}" d="${r.d}" style="fill:${fill};stroke:none${rule}"/>`;
  };
  const outline = page.outline
    .map(
      (o, i) =>
        `    <path id="outline-${i + 1}" d="${o.d}" style="fill:none;stroke:${page.outlineColor};stroke-width:${o.strokeWidth};stroke-linecap:${o.lineCap};stroke-linejoin:${o.lineJoin}"/>`,
    )
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    `<svg xmlns="${SVG_NS}" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" version="1.1">`,
    '  <g inkscape:groupmode="layer" id="regions" inkscape:label="regions">',
    page.regions.filter((r) => !r.locked).map(region).join('\n'),
    '  </g>',
    '  <g inkscape:groupmode="layer" id="details" inkscape:label="details">',
    page.regions.filter((r) => r.locked).map(region).join('\n'),
    '  </g>',
    '  <g inkscape:groupmode="layer" id="outline" inkscape:label="outline">',
    outline,
    '  </g>',
    '</svg>',
    '',
  ].join('\n');
}

/** xmldom returns "" for missing attributes; treat that as absent. */
function attr(el: Element, name: string): string | null {
  return el.getAttribute(name) || null;
}

function explicitName(el: Element): string | null {
  const label = attr(el, 'inkscape:label')?.trim();
  if (label) return label;
  const id = attr(el, 'id')?.trim();
  return id && !AUTO_ID.test(id) ? id : null;
}

function toRegionId(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

function parseStyle(style: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of (style ?? '').split(';')) {
    const i = decl.indexOf(':');
    if (i > 0) out[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
  }
  return out;
}

function inheritStyle(el: Element, declared: Record<string, string>, parent: Style): Style {
  const get = (prop: string) => declared[prop] ?? attr(el, prop) ?? undefined;
  const width = get('stroke-width');
  return {
    fill: get('fill') ?? parent.fill,
    stroke: get('stroke') ?? parent.stroke,
    strokeWidth: width !== undefined ? parseFloat(width) || 0 : parent.strokeWidth,
    lineCap: get('stroke-linecap') ?? parent.lineCap,
    lineJoin: get('stroke-linejoin') ?? parent.lineJoin,
    fillRule: get('fill-rule') ?? parent.fillRule,
  };
}

function toHex(color: string): string | undefined {
  const c = color.trim().toLowerCase();
  if (c === 'black') return '#000000';
  if (c === 'white') return '#FFFFFF';
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(c);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase();
  return /^#[0-9a-f]{6}$/.test(c) ? c.toUpperCase() : undefined;
}

/** Signed area of a path (positive when traced clockwise on screen). */
function signedArea(d: string): number {
  let sum = 0;
  for (const { points } of flattenPath(d)) {
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      sum += a.x * b.y - b.x * a.y;
    }
  }
  return sum / 2;
}
