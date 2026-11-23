/**
 * The parental gate's question (docs/UX.md "Parental gate"): a multiplication a grown-up answers on a number pad and a
 * child aged 2–5 cannot. The factors are 3–9 and 4–9, so every answer has two digits (12 to 81) and one lucky tap can
 * never pass.
 */
export type GateQuestion = { a: number; b: number; answer: number };

type Rand = () => number;

const between = (rand: Rand, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

export function makeGateQuestion(rand: Rand = Math.random): GateQuestion {
  const a = between(rand, 3, 9);
  const b = between(rand, 4, 9);
  return { a, b, answer: a * b };
}

/** Longest answer is 81, so input stops at two digits. */
export const GATE_MAX_DIGITS = 2;

/** `typed` with `digit` added, unless it is already as long as any answer can be. */
export const typeDigit = (typed: string, digit: number): string => (typed.length >= GATE_MAX_DIGITS ? typed : `${typed}${digit}`);

export const isGateAnswer = (q: GateQuestion, typed: string): boolean => typed !== '' && Number(typed) === q.answer;
