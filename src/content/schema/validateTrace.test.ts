import type { ColoringPage } from './page';
import { validateTrace } from './validateTrace';

const item = {
  schemaVersion: 1,
  id: 'trace-l',
  version: 1,
  set: 'uppercase',
  order: 12,
  title: 'L',
  viewBox: [0, 0, 1024, 768],
  strokes: [{ d: 'M300 150 V600' }, { d: 'M300 600 H700' }],
  colorPageId: 'letter-l',
};

/** A chunky "L" around the strokes. */
const page = {
  id: 'letter-l',
  viewBox: [0, 0, 1024, 768],
  regions: [
    { id: 'background', d: 'M0 0 H1024 V768 H0 Z', fillRule: 'nonzero', locked: false },
    { id: 'letter', d: 'M250 100 H350 V550 H750 V650 H250 Z', fillRule: 'nonzero', locked: false },
  ],
} as unknown as ColoringPage; // only id, viewBox and regions matter here

const errorsOf = (input: unknown, p?: ColoringPage) => validateTrace(input, p).issues.filter((i) => i.severity === 'error');

describe('validateTrace', () => {
  it('accepts strokes that lie on the coloring page', () => {
    expect(validateTrace(item, page)).toMatchObject({ ok: true, issues: [] });
  });

  it('rejects schema errors', () => {
    expect(validateTrace({ ...item, set: 'cursive' }).ok).toBe(false);
    expect(validateTrace({ ...item, strokes: [] }).ok).toBe(false);
  });

  it('rejects a stroke with two pieces, a tiny stroke, or one off the page', () => {
    expect(errorsOf({ ...item, strokes: [{ d: 'M300 150 V600 M300 600 H700' }] })[0]!.message).toMatch(/exactly one subpath/);
    expect(errorsOf({ ...item, strokes: [{ d: 'M300 150 V170' }] })[0]!.message).toMatch(/Too short/);
    expect(errorsOf({ ...item, strokes: [{ d: 'M300 150 V900' }] })[0]!.message).toMatch(/Leaves the page/);
  });

  it('rejects a stroke that leaves the colorable shape', () => {
    const errors = errorsOf({ ...item, strokes: [{ d: 'M300 150 V600' }, { d: 'M300 600 H900' }] }, page);
    expect(errors).toEqual([expect.objectContaining({ path: 'strokes.1', message: expect.stringMatching(/Leaves the colorable shape/) })]);
  });

  it('rejects the wrong coloring page', () => {
    expect(errorsOf({ ...item, colorPageId: 'letter-m' }, page)[0]!.path).toBe('colorPageId');
  });
});
