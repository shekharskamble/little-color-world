import { LinearGradient, Shader, Skia, vec, type SkRect } from '@shopify/react-native-skia';

import { PATTERN_IDS, TEXTURE_IDS, type FillStyle } from '@/content/schema/fill';
import { gradientEnds } from '@/engine/fills/fills';

import { PATTERN_CELL, PATTERN_SKSL } from './patternShader';
import { TEXTURE_SKSL } from './textureShader';

// The sources are fixed and compiled in patternShader.test.ts and textureShader.test.ts, so a failure is a broken build.
const compile = (source: string, name: string) => {
  const effect = Skia.RuntimeEffect.Make(source);
  if (!effect) throw new Error(`${name} shader failed to compile`);
  return effect;
};
const patternEffect = compile(PATTERN_SKSL, 'Pattern');
export const textureEffect = compile(TEXTURE_SKSL, 'Texture');

export const rgba = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).concat(1);

/**
 * The paint for a fill, as children of a Skia shape: nothing for a solid colour (the shape's `color` is used), a
 * gradient laid across `bounds` for a rainbow, or the pattern or texture shader. Pair it with `color={fillBaseColor(fill)}` on the
 * shape so an unknown pattern id from newer saved data still shows its main colour.
 */
export function FillShader({ fill, bounds, cell = PATTERN_CELL }: { fill: FillStyle; bounds: SkRect; /** Pattern repeat size; small for tool pictures. */ cell?: number }) {
  if (fill.type === 'linear') {
    const { start, end } = gradientEnds(bounds, fill.angle);
    return (
      <LinearGradient
        start={vec(start.x, start.y)}
        end={vec(end.x, end.y)}
        colors={fill.stops.map((s) => s.color)}
        positions={fill.stops.map((s) => s.offset)}
      />
    );
  }
  if (fill.type === 'pattern') {
    const kind = (PATTERN_IDS as readonly string[]).indexOf(fill.patternId);
    if (kind < 0) return null;
    return <Shader source={patternEffect} uniforms={{ kind, cell, fg: rgba(fill.fg), bg: rgba(fill.bg) }} />;
  }
  if (fill.type === 'texture') {
    // TEXTURE_IDS index is the shader's `kind` (checked in textureShader.test.ts).
    const kind = (TEXTURE_IDS as readonly string[]).indexOf(fill.textureId);
    if (kind < 0) return null;
    const box = [bounds.x, bounds.y, bounds.width, bounds.height];
    return <Shader source={textureEffect} uniforms={{ kind, color: rgba(fill.color), box }} />;
  }
  return null;
}
