import type { ColoringPage } from '../../content/schema/page';

import { isComplete, requiredRegionIds } from './completion';

const red = { type: 'solid', color: '#E8453C' } as const;

const page = {
  regions: [
    { id: 'body', d: 'M0 0 H1 V1 Z', fillRule: 'nonzero', locked: false },
    { id: 'pupil', d: 'M0 0 H1 V1 Z', fillRule: 'nonzero', locked: true },
    { id: 'small-spot', d: 'M0 0 H1 V1 Z', fillRule: 'nonzero', locked: false, small: true },
    { id: 'tail', d: 'M0 0 H1 V1 Z', fillRule: 'nonzero', locked: false },
  ],
} as unknown as ColoringPage; // only regions matter here

describe('picture completion', () => {
  it('requires every colourable region except locked and small ones', () => {
    expect(requiredRegionIds(page)).toEqual(['body', 'tail']);
  });

  it('is complete only when all required regions are filled', () => {
    const req = requiredRegionIds(page);
    expect(isComplete({}, req)).toBe(false);
    expect(isComplete({ body: red }, req)).toBe(false);
    expect(isComplete({ body: red, tail: red }, req)).toBe(true);
  });

  it('never counts a page with nothing to fill as complete', () => {
    expect(isComplete({}, [])).toBe(false);
  });
});
