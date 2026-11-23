import { z } from 'zod';

export const TraceSet = z.enum(['uppercase', 'lowercase', 'numbers', 'shapes']);

export const TraceStroke = z.object({
  /** One open (or closed) subpath along the middle of the letter, drawn in handwriting direction. */
  d: z.string().min(1),
});

/** Trace and Color: follow the strokes in order, then color the matching page (docs/PRODUCT.md activity 2). */
export const TraceItem = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
  version: z.number().int().positive(),
  set: TraceSet,
  /** Sort order within the set. */
  order: z.number().int(),
  title: z.string().min(1),
  viewBox: z.tuple([z.literal(0), z.literal(0), z.number().positive(), z.number().positive()]),
  /** Stroke order is tracing order. */
  strokes: z.array(TraceStroke).min(1).max(8),
  /** Handwriting lines drawn faintly behind letters (y in page units; `dashed` for the middle line). None for shapes. */
  guides: z.array(z.object({ y: z.number(), dashed: z.boolean().default(false) })).max(4).default([]),
  /** The coloring page opened after tracing; it must cover every stroke. */
  colorPageId: z.string().min(1),
});

export type TraceSet = z.infer<typeof TraceSet>;
export type TraceStroke = z.infer<typeof TraceStroke>;
export type TraceItem = z.infer<typeof TraceItem>;
