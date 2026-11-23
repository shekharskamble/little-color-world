import { isGateAnswer, makeGateQuestion, typeDigit } from './parentalGate';

describe('parental gate', () => {
  it('asks a multiplication whose answer always has two digits', () => {
    for (let i = 0; i < 200; i++) {
      const q = makeGateQuestion();
      expect(q.a).toBeGreaterThanOrEqual(3);
      expect(q.a).toBeLessThanOrEqual(9);
      expect(q.b).toBeGreaterThanOrEqual(4);
      expect(q.b).toBeLessThanOrEqual(9);
      expect(q.answer).toBe(q.a * q.b);
      expect(q.answer).toBeGreaterThanOrEqual(10); // never a single digit, so one tap can never pass
    }
  });

  it('covers the whole range', () => {
    expect(makeGateQuestion(() => 0)).toEqual({ a: 3, b: 4, answer: 12 });
    expect(makeGateQuestion(() => 0.999)).toEqual({ a: 9, b: 9, answer: 81 });
  });

  it('accepts only the exact answer', () => {
    const q = { a: 7, b: 6, answer: 42 };
    expect(isGateAnswer(q, '42')).toBe(true);
    expect(isGateAnswer(q, '4')).toBe(false);
    expect(isGateAnswer(q, '24')).toBe(false);
    expect(isGateAnswer(q, '')).toBe(false);
  });

  it('stops at two digits', () => {
    expect(typeDigit('', 4)).toBe('4');
    expect(typeDigit('4', 2)).toBe('42');
    expect(typeDigit('42', 7)).toBe('42');
  });
});
