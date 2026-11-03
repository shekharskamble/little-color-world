import { FillStyle, PATTERN_IDS } from '@/content/schema/fill';

import { FINISHES, INITIAL_TOOL, PATTERNS, RAINBOWS, TODDLER_PALETTE, TOOL_FINISHES, bucketFill, finishFor, strokePen } from './swatches';

const blue = TODDLER_PALETTE.find((s) => s.name === 'blue')!;

describe('palette', () => {
  it('offers 69 distinct colours with unique names', () => {
    expect(TODDLER_PALETTE).toHaveLength(69);
    expect(new Set(TODDLER_PALETTE.map((s) => s.name)).size).toBe(69);
    expect(new Set(TODDLER_PALETTE.map((s) => s.fill.color.toUpperCase())).size).toBe(69);
  });

  it('keeps every colour name from the 48-colour palette', () => {
    const before = ['red', 'orange', 'yellow', 'green', 'teal', 'sky blue', 'blue', 'purple', 'pink', 'peach', 'brown', 'black',
      'dark red', 'coral', 'magenta', 'rose', 'light pink', 'blush', 'apricot', 'gold', 'light yellow', 'cream', 'lime', 'grass',
      'olive', 'dark green', 'emerald', 'mint', 'seafoam', 'turquoise', 'light blue', 'cornflower', 'royal blue', 'navy', 'indigo',
      'violet', 'lavender', 'lilac', 'light peach', 'tan', 'caramel', 'cocoa', 'chocolate', 'sand', 'slate', 'gray', 'silver', 'white'];
    const names = new Set(TODDLER_PALETTE.map((s) => s.name));
    for (const n of before) expect(names.has(n)).toBe(true);
  });

  it('only offers fills that pass the saved-data schema', () => {
    const all = [
      ...TODDLER_PALETTE.map((s) => s.fill),
      ...RAINBOWS.map((r) => bucketFill('rainbow', { ...INITIAL_TOOL, rainbow: r.name })),
      ...PATTERNS.map((pattern) => bucketFill('pattern', { ...INITIAL_TOOL, color: blue, pattern })),
      ...FINISHES.map((f) => bucketFill(f, { ...INITIAL_TOOL, color: blue })),
    ];
    for (const f of all) expect(FillStyle.safeParse(f).success).toBe(true);
  });

  it('shows every built-in pattern and uniquely named rainbows', () => {
    expect(PATTERNS).toEqual(PATTERN_IDS);
    expect(new Set(RAINBOWS.map((r) => r.name)).size).toBe(RAINBOWS.length);
  });

  it('pours each bucket in the current colour', () => {
    const tool = { ...INITIAL_TOOL, color: blue, pattern: 'hearts' as const };
    expect(bucketFill('plain', tool)).toBe(blue.fill);
    expect(bucketFill('glitter', tool)).toEqual({ type: 'texture', textureId: 'glitter', color: blue.fill.color });
    expect(bucketFill('pattern', tool)).toMatchObject({ patternId: 'hearts', fg: blue.fill.color });
    expect(bucketFill('rainbow', { ...tool, rainbow: 'ocean' })).toBe(RAINBOWS[2]!.fill);
  });

  it('offers each tool only the paints it can use, and falls back to plain', () => {
    expect(TOOL_FINISHES.bucket).toEqual(FINISHES);
    expect(FINISHES).not.toContain('glossy');
    const glitter = { ...INITIAL_TOOL, finish: 'glitter' as const };
    expect(finishFor(glitter, 'bucket')).toBe('glitter');
    expect(finishFor(glitter, 'brush')).toBe('glitter');
    expect(finishFor(glitter, 'pencil')).toBe('plain');
    expect(finishFor({ ...INITIAL_TOOL, finish: 'pattern' }, 'brush')).toBe('plain');
  });

  it('draws the brush as a marker or a glitter pen, and the pencil as a pencil', () => {
    expect(strokePen(INITIAL_TOOL, 'brush')).toBe('marker');
    expect(strokePen({ ...INITIAL_TOOL, finish: 'glitter' }, 'brush')).toBe('glitter');
    expect(strokePen({ ...INITIAL_TOOL, finish: 'glitter' }, 'pencil')).toBe('pencil');
  });
});
