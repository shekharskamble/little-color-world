// No imports: patternShader.test.ts compiles this source with canvaskit-wasm under Node.

/**
 * One SkSL runtime effect draws every built-in pattern (src/content/schema/fill.ts PATTERN_IDS, same order as `kind`).
 * Coordinates are page units, so a pattern keeps its size when the child zooms. Shapes are signed distances with a soft
 * one-unit edge, so they stay smooth at any zoom. `fg` and `bg` are opaque RGBA in 0..1.
 */
export const PATTERN_SKSL = `
uniform float kind;
uniform float cell;
uniform float4 fg;
uniform float4 bg;

float cover(float d) { return 1.0 - smoothstep(-0.75, 0.75, d); }
float dot2(float2 v) { return dot(v, v); }

float sdHeart(float2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot2(p - float2(0.25, 0.75))) - 0.35355339;
  return sqrt(min(dot2(p - float2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

float sdStar5(float2 p, float r, float rf) {
  float2 k1 = float2(0.809016994, -0.587785252);
  float2 k2 = float2(-k1.x, k1.y);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  float2 ba = rf * float2(-k1.y, k1.x) - float2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}

// Position inside a cell (-cell/2..cell/2), every other row shifted half a cell so shapes sit in a brick layout.
float2 brick(float2 p) {
  float row = floor(p.y / cell);
  float2 s = float2(p.x + mod(row, 2.0) * 0.5 * cell, p.y);
  return (fract(s / cell) - 0.5) * cell;
}

half4 main(float2 p) {
  int k = int(kind + 0.5);
  float m = 0.0;
  if (k == 0) {
    m = cover(length(brick(p)) - 0.24 * cell);
  } else if (k == 1) {
    float u = (p.x + p.y) / cell;
    m = cover((abs(fract(u) - 0.5) - 0.25) * cell * 0.7071);
  } else if (k == 2) {
    float a = cover((abs(fract(p.x / cell) - 0.5) - 0.25) * cell);
    float b = cover((abs(fract(p.y / cell) - 0.5) - 0.25) * cell);
    m = a + b - 2.0 * a * b;
  } else if (k == 3) {
    float y = p.y / cell + abs(fract(p.x / cell) - 0.5);
    m = cover((abs(fract(y) - 0.5) - 0.17) * cell * 0.85);
  } else if (k == 4) {
    float s = 0.62 * cell;
    float2 q = brick(p);
    m = cover(sdHeart(float2(q.x, -q.y) / s + float2(0.0, 0.5)) * s);
  } else if (k == 5) {
    float2 q = brick(p);
    m = cover(sdStar5(float2(q.x, -q.y + 0.03 * cell), 0.36 * cell, 0.45));
  } else if (k == 6) {
    float y = p.y / cell + 0.16 * sin(p.x / cell * 6.2831853);
    m = cover((abs(fract(y) - 0.5) - 0.2) * cell * 0.9);
  } else if (k == 7) {
    float2 e = (0.5 - abs(fract(p / cell) - 0.5)) * cell;
    m = cover(min(e.x, e.y) - 0.07 * cell);
  }
  return half4(mix(bg, fg, m));
}
`;

/** Pattern repeat size in page units (pages are 1024 × 768): about seven shapes across a big body. */
export const PATTERN_CELL = 44;
