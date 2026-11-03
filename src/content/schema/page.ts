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
  /**
   * A deliberately small part children can still colour (a dinosaur's ridge, a spot). It may be smaller than the age
   * band's minimum area, down to SMALL_MIN_AREA (validatePage). Set by the importer for ids starting with "small-".
   */
  small: z.boolean().optional(),
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
  /** Short line under the title for the grown-up to read aloud, e.g. "3 sides, 3 corners". */
  subtitle: z.string().min(1).optional(),
  ageBand: AgeBand,
  viewBox: z.tuple([z.literal(0), z.literal(0), z.number().positive(), z.number().positive()]),
  background: ColorHex.default('#FFFFFF'),
  outlineColor: ColorHex.default('#1E1B2E'),
  /** Array order is draw order: first is bottom-most. */
  regions: z.array(Region).min(1).max(200),
  /**
   * Always drawn above every fill. May be empty when a locked region draws the page's lines instead (converted clipart
   * with no scene around it); validatePage requires one or the other.
   */
  outline: z.array(OutlinePath),
});

export const Theme = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Catalog accent: card border and name pill. */
  color: ColorHex,
  /** Interim illustration until theme artwork exists (Phase 3). */
  emoji: z.string().min(1),
  order: z.number().int(),
  /** Left out of the catalog (e.g. artwork being reworked). Its pages stay bundled and valid. */
  hidden: z.boolean().default(false),
  /** Page id shown on the catalog card; defaults to the theme's first page. */
  cover: z.string().min(1).optional(),
});

export type Region = z.infer<typeof Region>;
export type OutlinePath = z.infer<typeof OutlinePath>;
export type ColoringPage = z.infer<typeof ColoringPage>;
export type Theme = z.infer<typeof Theme>;
