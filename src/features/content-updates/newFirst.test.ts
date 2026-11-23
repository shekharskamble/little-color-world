import { newFirst } from './newFirst';

describe('newFirst', () => {
  const id = (x: string) => x;
  it('moves new items to the front, newest arrival first, keeping the rest in order', () => {
    const arrived = new Map([
      ['d', 100],
      ['b', 200],
    ]);
    expect(newFirst(['a', 'b', 'c', 'd', 'e'], id, arrived)).toEqual(['b', 'd', 'a', 'c', 'e']);
  });
  it('keeps pack order for items that arrived together', () => {
    const arrived = new Map([
      ['x2', 5],
      ['x1', 5],
      ['x3', 5],
    ]);
    expect(newFirst(['a', 'x2', 'x1', 'x3'], id, arrived)).toEqual(['x2', 'x1', 'x3', 'a']);
  });
  it('leaves the order alone with nothing new', () => {
    expect(newFirst(['a', 'b'], id, new Map())).toEqual(['a', 'b']);
  });
});
