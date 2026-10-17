import { bundledPageSources } from '../registry';
import { validatePage } from './validatePage';

const base = {
  schemaVersion: 1,
  id: 'test-page',
  version: 1,
  themeId: 't',
  title: 'Test',
  ageBand: '2-3',
  viewBox: [0, 0, 1024, 768],
  regions: [
    { id: 'a', d: 'M0 0 H512 V768 H0 Z' },
    { id: 'b', d: 'M512 0 H1024 V768 H512 Z' },
  ],
  outline: [{ d: 'M512 0 V768', strokeWidth: 10 }],
};

const errorsOf = (input: unknown) => validatePage(input).issues.filter((i) => i.severity === 'error');

describe('validatePage', () => {
  it.each(Object.entries(bundledPageSources))('bundled page %s is valid with no warnings', (_id, source) => {
    const result = validatePage(source);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('accepts a minimal valid page and applies defaults', () => {
    const result = validatePage(base);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.regions[0]!.fillRule).toBe('nonzero');
      expect(result.page.regions[0]!.locked).toBe(false);
    }
  });

  it('rejects schema violations', () => {
    expect(validatePage({ ...base, schemaVersion: 2 }).ok).toBe(false);
    expect(validatePage({ ...base, regions: [{ id: 'Bad Id', d: 'M0 0 H1 V1 Z' }] }).ok).toBe(false);
    expect(validatePage({ ...base, outline: [{ d: 'M0 0 H10', strokeWidth: 2 }] }).ok).toBe(false);
  });

  it('rejects duplicate ids, open subpaths, unparsable paths and out-of-bounds regions', () => {
    const regions = [
      { id: 'a', d: 'M0 0 H512 V768 H0 Z' },
      { id: 'a', d: 'M512 0 H1024 V768 H512 Z' },
      { id: 'open', d: 'M0 0 H500 V500' },
      { id: 'broken', d: 'M0 0 L10' },
      { id: 'far', d: 'M2000 0 H2500 V500 H2000 Z' },
    ];
    const messages = errorsOf({ ...base, regions }).map((i) => `${i.path}: ${i.message}`);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/regions\.1\(a\): Duplicate/),
        expect.stringMatching(/open.*not closed/),
        expect.stringMatching(/broken.*Expected number/),
        expect.stringMatching(/far.*outside/),
      ]),
    );
  });

  it('flags regions too small for the age band', () => {
    const regions = [...base.regions, { id: 'tiny', d: 'M10 10 H20 V20 H10 Z' }];
    expect(errorsOf({ ...base, regions }).map((i) => i.path)).toContain('regions.2(tiny)');
    // Locked decorative regions are exempt.
    expect(errorsOf({ ...base, regions: [...base.regions, { id: 'tiny', d: 'M10 10 H20 V20 H10 Z', locked: true }] })).toEqual([]);
  });

  it('requires outlines thick enough for the age band', () => {
    expect(errorsOf({ ...base, outline: [{ d: 'M512 0 V768', strokeWidth: 6 }] })).toHaveLength(1);
    expect(errorsOf({ ...base, ageBand: '4-5', outline: [{ d: 'M512 0 V768', strokeWidth: 6 }] })).toEqual([]);
  });
});
