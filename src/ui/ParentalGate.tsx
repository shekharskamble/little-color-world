import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { isGateAnswer, makeGateQuestion, typeDigit } from '@/engine/parentalGate';

import { colors, roundedFont } from './tokens';

type Props = {
  /** What the grown-up is about to do, e.g. "open Settings". */
  purpose: string;
  onPass: () => void;
  onCancel: () => void;
};

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

/**
 * Grown-ups-only check before anything that leaves the app (docs/UX.md "Parental gate", App Store Kids Category). A
 * random multiplication with a number pad; a wrong answer clears and asks a new question. Drawn over its parent (not a
 * separate Modal), so it can sit inside a sheet. Plain grown-up styling on purpose, so it never looks like a toy.
 */
export function ParentalGate({ purpose, onPass, onCancel }: Props) {
  const [question, setQuestion] = useState(() => makeGateQuestion());
  const [typed, setTyped] = useState('');
  const [wrong, setWrong] = useState(false);

  const press = (digit: number) => {
    const next = typeDigit(typed, digit);
    setWrong(false);
    if (isGateAnswer(question, next)) {
      onPass();
      return;
    }
    // Once as many digits as the answer has are typed and it is wrong, start again with a new question.
    if (next.length >= String(question.answer).length) {
      setWrong(true);
      setTyped('');
      setQuestion(makeGateQuestion());
      return;
    }
    setTyped(next);
  };

  return (
    <View style={styles.backdrop} accessibilityViewIsModal>
      <View style={styles.card}>
        <Text style={styles.title}>For grown-ups</Text>
        <Text style={styles.body}>To {purpose}, please answer:</Text>
        <Text style={styles.question} accessibilityLabel={`What is ${question.a} times ${question.b}?`}>
          {question.a} × {question.b} = {typed || '?'}
        </Text>
        {wrong && <Text style={styles.wrong}>Not quite. Here is a new one.</Text>}
        <View style={styles.pad}>
          {DIGITS.map((d) => (
            <Pressable key={d} accessibilityRole="button" accessibilityLabel={String(d)} onPress={() => press(d)} style={styles.key}>
              <Text style={styles.keyText}>{d}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const KEY = 64;

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(42,39,51,0.55)', alignItems: 'center', justifyContent: 'center' },
  card: { width: 420, padding: 28, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', gap: 12 },
  title: { fontFamily: roundedFont, fontSize: 24, fontWeight: '700', color: colors.ink },
  body: { fontSize: 16, color: colors.inkSoft, textAlign: 'center' },
  question: { fontFamily: roundedFont, fontSize: 36, fontWeight: '700', color: colors.ink, marginVertical: 4 },
  wrong: { fontSize: 15, color: colors.inkSoft },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, width: KEY * 5 + 10 * 4 },
  key: { width: KEY, height: KEY, borderRadius: 14, borderWidth: 2, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 26, fontWeight: '600', color: colors.ink },
  cancel: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', marginTop: 4 },
  cancelText: { fontSize: 16, fontWeight: '600', color: colors.inkSoft },
});
