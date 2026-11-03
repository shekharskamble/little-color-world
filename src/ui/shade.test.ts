import { shade } from './shade';

describe('shade', () => {
  it('darkens each channel by the given amount', () => {
    expect(shade('#FFFFFF', 0.5)).toBe('#808080');
    expect(shade('#3A7BEB', 0)).toBe('#3A7BEB');
    expect(shade('#3A7BEB', 1)).toBe('#000000');
  });

  it('clamps the amount and leaves unparseable input unchanged', () => {
    expect(shade('#FFFFFF', 2)).toBe('#000000');
    expect(shade('red', 0.2)).toBe('red');
  });
});
