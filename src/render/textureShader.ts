// No imports: textureShader.test.ts compiles this source with canvaskit-wasm under Node.

/** `kind` values of TEXTURE_SKSL. Glossy and glitter match TEXTURE_IDS (src/content/schema/fill.ts); crayon and pencil are pens. */
export const TEXTURE_KIND = { glossy: 0, glitter: 1, crayon: 2, pencil: 3 } as const;

/**
 * One SkSL runtime effect for the surfaces a colour can have. `color` is opaque RGBA in 0..1; `box` is the shape's
 * bounds (x, y, width, height) in page units.
 * - glossy: lit from the top with a soft white shine near the top left, laid out across `box` so every part shines.
 * - glitter: the colour scattered with small sparkles and a few four-point twinkles, in page units so they keep their
 *   size when the child zooms.
 * - crayon: waxy grain; the paper shows through in streaks (the result is partly transparent).
 * - pencil: a fine graphite-like grain along the stroke; mostly solid, with tiny paper flecks.
 */
export const TEXTURE_SKSL = `
uniform float kind;
uniform float4 color;
uniform float4 box;

float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }

float vnoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1.0, 0.0)), u.x), mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x), u.y);
}

half4 main(float2 p) {
  int k = int(kind + 0.5);
  float3 c = color.rgb;
  if (k == 0) {
    float2 uv = (p - box.xy) / max(box.zw, float2(1.0));
    float3 shade = mix(mix(c, float3(1.0), 0.28), c * 0.82, smoothstep(0.0, 1.0, uv.y));
    float shine = 1.0 - smoothstep(0.35, 1.0, length((uv - float2(0.32, 0.22)) / float2(0.24, 0.12)));
    return half4(mix(shade, float3(1.0), 0.9 * shine), 1.0);
  }
  if (k == 1) {
    float3 base = c * (0.88 + 0.12 * vnoise(p * 0.35));
    float cell = 9.0;
    float2 id = floor(p / cell);
    float2 at = (float2(hash(id + 3.1), hash(id + 7.7)) * 0.6 + 0.2) * cell;
    float d = length(p - id * cell - at);
    float r = 0.8 + 1.6 * hash(id + 1.3);
    float h = hash(id);
    float dot1 = (h > 0.45 ? 1.0 : 0.0) * (1.0 - smoothstep(r - 0.6, r + 0.6, d));
    float3 spark = h > 0.8 ? float3(1.0) : mix(c, float3(1.0), 0.6);
    float big = 34.0;
    float2 bid = floor(p / big);
    float2 q = p - bid * big - (float2(hash(bid + 5.0), hash(bid + 9.0)) * 0.5 + 0.25) * big;
    float arms = max((1.0 - smoothstep(0.0, 1.1, abs(q.x))) * (1.0 - smoothstep(0.0, 6.0, abs(q.y))),
                     (1.0 - smoothstep(0.0, 1.1, abs(q.y))) * (1.0 - smoothstep(0.0, 6.0, abs(q.x))));
    float star = (hash(bid) > 0.55 ? 1.0 : 0.0) * max(arms, 1.0 - smoothstep(1.0, 2.2, length(q)));
    float3 lit = mix(mix(base, spark, dot1), float3(1.0), star);
    return half4(lit, 1.0);
  }
  if (k == 3) {
    float g = 0.5 * vnoise(p * 1.4) + 0.5 * vnoise(float2(p.x + p.y, p.y - p.x) * float2(2.2, 0.6));
    float pa = 0.62 + 0.38 * smoothstep(0.22, 0.6, g);
    return half4(c * pa, pa);
  }
  // Coarse blotches plus fine diagonal streaks, like wax dragged across paper.
  float2 r = float2(p.x + p.y, p.y - p.x) * 0.7071;
  float n = 0.45 * vnoise(p * 0.18) + 0.55 * vnoise(r * float2(0.9, 0.11));
  float a = 0.5 + 0.5 * smoothstep(0.3, 0.68, n);
  return half4(c * a, a);
}
`;
