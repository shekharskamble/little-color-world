import { chunk, clampPage } from './paging';

describe('chunk', () => {
  it('splits into full pages plus a shorter last page', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('returns no pages for no items', () => {
    expect(chunk([], 6)).toEqual([]);
  });

  it('rejects a page size below 1', () => {
    expect(() => chunk([1], 0)).toThrow(RangeError);
  });
});

describe('clampPage', () => {
  it('keeps the index within the available pages', () => {
    expect(clampPage(-1, 3)).toBe(0);
    expect(clampPage(5, 3)).toBe(2);
    expect(clampPage(1, 3)).toBe(1);
  });

  it('returns 0 when there are no pages', () => {
    expect(clampPage(2, 0)).toBe(0);
  });
});
