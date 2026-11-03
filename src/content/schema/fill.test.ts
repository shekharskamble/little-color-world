import { FillStyle, fillBaseColor } from './fill';

describe('FillStyle', () => {
  it('still reads solid fills saved before patterns existed', () => {
    expect(FillStyle.parse({ type: 'solid', color: '#E8453C' })).toEqual({ type: 'solid', color: '#E8453C' });
  });

  it('reads a pattern id this version does not know, so newer saved art still loads', () => {
    expect(FillStyle.safeParse({ type: 'pattern', patternId: 'sparkles', fg: '#E8453C', bg: '#FFFFFF' }).success).toBe(true);
  });

  it('reads glossy and glitter fills, and a texture id this version does not know', () => {
    expect(FillStyle.safeParse({ type: 'texture', textureId: 'glossy', color: '#E8453C' }).success).toBe(true);
    expect(FillStyle.safeParse({ type: 'texture', textureId: 'neon', color: '#E8453C' }).success).toBe(true);
    expect(FillStyle.safeParse({ type: 'texture', textureId: 'glitter', color: 'red' }).success).toBe(false);
  });

  it('rejects gradients with one stop or offsets outside 0..1', () => {
    expect(FillStyle.safeParse({ type: 'linear', angle: 0, stops: [{ offset: 0, color: '#E8453C' }] }).success).toBe(false);
    expect(
      FillStyle.safeParse({ type: 'linear', angle: 0, stops: [{ offset: 0, color: '#E8453C' }, { offset: 2, color: '#3A7BEB' }] }).success,
    ).toBe(false);
  });

  it('gives each fill one stand-in colour', () => {
    expect(fillBaseColor({ type: 'solid', color: '#111111' })).toBe('#111111');
    expect(fillBaseColor({ type: 'pattern', patternId: 'dots', fg: '#222222', bg: '#FFFFFF' })).toBe('#222222');
    expect(fillBaseColor({ type: 'texture', textureId: 'glitter', color: '#555555' })).toBe('#555555');
    expect(
      fillBaseColor({ type: 'linear', angle: 90, stops: [{ offset: 0, color: '#333333' }, { offset: 1, color: '#444444' }] }),
    ).toBe('#333333');
  });
});
