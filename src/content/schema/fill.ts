import { z } from 'zod';

export const ColorHex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected #RRGGBB');

export const SolidFill = z.object({ type: z.literal('solid'), color: ColorHex });

/** A colour band at `offset` (0..1) along a gradient. */
export const GradientStop = z.object({ offset: z.number().min(0).max(1), color: ColorHex });

/**
 * A straight gradient laid out across the region's bounding box (so a rainbow looks right on a claw and on a body).
 * `angle` is in degrees: 0 runs left → right, 90 top → bottom.
 */
export const LinearFill = z.object({ type: z.literal('linear'), stops: z.array(GradientStop).min(2).max(12), angle: z.number() });

export const PATTERN_IDS = ['dots', 'stripes', 'checks', 'zigzag', 'hearts', 'stars', 'waves', 'grid'] as const;

/**
 * A repeating pattern in `fg` on `bg`. The pattern is drawn by a shader built into the app (src/render/patternShader.ts),
 * never downloaded. An id this app version does not know (from newer saved data) parses as a string so the artwork
 * still loads; the renderer shows it as a solid `fg`.
 */
export const PatternFill = z.object({ type: z.literal('pattern'), patternId: z.string().min(1).max(32), fg: ColorHex, bg: ColorHex });

export const TEXTURE_IDS = ['glossy', 'glitter'] as const;

/**
 * A plain colour with a surface: shiny (`glossy`) or sparkly (`glitter`). Drawn by a shader built into the app
 * (src/render/textureShader.ts). Like `patternId`, an unknown `textureId` parses so newer saved data still loads, and
 * renders as plain `color`.
 */
export const TextureFill = z.object({ type: z.literal('texture'), textureId: z.string().min(1).max(32), color: ColorHex });

/**
 * Serializable fill style (docs/ARCHITECTURE.md §4). Persisted data is parsed with this schema, so new members must
 * stay additive. Radial gradients are not built yet.
 */
export const FillStyle = z.discriminatedUnion('type', [SolidFill, LinearFill, PatternFill, TextureFill]);

export type FillStyle = z.infer<typeof FillStyle>;
export type SolidFill = z.infer<typeof SolidFill>;
export type LinearFill = z.infer<typeof LinearFill>;
export type PatternFill = z.infer<typeof PatternFill>;
export type TextureFill = z.infer<typeof TextureFill>;
export type GradientStop = z.infer<typeof GradientStop>;
export type PatternId = (typeof PATTERN_IDS)[number];
export type TextureId = (typeof TEXTURE_IDS)[number];

/** The one colour that stands for a fill: what the brush paints with when a pattern or rainbow is chosen. */
export function fillBaseColor(fill: FillStyle): string {
  switch (fill.type) {
    case 'solid':
      return fill.color;
    case 'linear':
      return fill.stops[0]!.color;
    case 'pattern':
      return fill.fg;
    case 'texture':
      return fill.color;
  }
}
