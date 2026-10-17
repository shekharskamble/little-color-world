import { z } from 'zod';

import { ColorHex, FillStyle } from './fill';

export const RegionId = z.string().regex(/^[a-z][a-z0-9_-]{0,47}$/, 'Region id must be lowercase kebab/snake case');

export const Region = z.object({
  id: RegionId,
  /** SVG path data in page units. Closed subpaths only. */
  d: z.string().min(1),
  fillRule: z.enum(['nonzero', 'evenodd']).default('nonzero'),
  /** Fill shown when the region has not been colored (and after erasing). Defaults to white. */
  defaultFill: FillStyle.optional(),
  /** Decorative region (e.g. a pupil) that cannot be filled; taps pass through it. */
  locked: z.boolean().default(false),
  label: z.string().optional(),
});

export const OutlinePath = z.object({
  d: z.string().min(1),
  strokeWidth: z.number().min(4).max(40),
  lineCap: z.enum(['round', 'butt', 'square']).default('round'),
  lineJoin: z.enum(['round', 'miter', 'bevel']).default('round'),
});

export const AgeBand = z.enum(['2-3', '4-5', 'all']);

export const ColoringPage = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
  version: z.number().int().positive(),
  themeId: z.string().min(1),
  title: z.string().min(1),
  ageBand: AgeBand,
  viewBox: z.tuple([z.literal(0), z.literal(0), z.number().positive(), z.number().positive()]),
  background: ColorHex.default('#FFFFFF'),
  outlineColor: ColorHex.default('#1E1B2E'),
  /** Array order is draw order: first is bottom-most. */
  regions: z.array(Region).min(1).max(200),
  /** Always drawn above every fill. */
  outline: z.array(OutlinePath).min(1),
});

export const Theme = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Card tint. */
  color: ColorHex,
  /** Interim illustration until theme artwork exists (Phase 3). */
  emoji: z.string().min(1),
  order: z.number().int(),
});

export type Region = z.infer<typeof Region>;
export type OutlinePath = z.infer<typeof OutlinePath>;
export type ColoringPage = z.infer<typeof ColoringPage>;
export type Theme = z.infer<typeof Theme>;
