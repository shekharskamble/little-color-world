import { z } from 'zod';

export const ColorHex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected #RRGGBB');

export const SolidFill = z.object({ type: z.literal('solid'), color: ColorHex });

/**
 * Serializable fill style. Phase 1 ships solid fills only; gradients, patterns
 * and textures are added as new union members in Phase 2 (docs/ARCHITECTURE.md §4).
 * Persisted data is parsed with this schema, so new members must stay additive.
 */
export const FillStyle = z.discriminatedUnion('type', [SolidFill]);

export type FillStyle = z.infer<typeof FillStyle>;
export type SolidFill = z.infer<typeof SolidFill>;
