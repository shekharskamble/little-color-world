import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadow, size } from '@/ui/tokens';

import type { Swatch } from './swatches';

export type Tool = { kind: 'fill'; swatch: Swatch } | { kind: 'eraser' };

type Props = { swatches: readonly Swatch[]; tool: Tool; onSelect: (tool: Tool) => void };

const SWATCH = size.touchMin;

export function Palette({ swatches, tool, onSelect }: Props) {
  return (
    <View style={styles.rail}>
      <View style={styles.grid}>
        {swatches.map((s) => {
          const selected = tool.kind === 'fill' && tool.swatch.name === s.name;
          return (
            <Pressable
              key={s.name}
              accessibilityRole="button"
              accessibilityLabel={s.name}
              accessibilityState={{ selected }}
              onPress={() => onSelect({ kind: 'fill', swatch: s })}
              style={[styles.swatch, { backgroundColor: s.fill.color }, selected && styles.selected]}
            />
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Eraser"
        accessibilityState={{ selected: tool.kind === 'eraser' }}
        onPress={() => onSelect({ kind: 'eraser' })}
        style={[styles.swatch, styles.eraser, tool.kind === 'eraser' && styles.selected]}
      >
        <Text style={styles.eraserGlyph}>🧽</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { width: SWATCH * 2 + 48, alignItems: 'center', justifyContent: 'center', gap: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: SWATCH * 2 + 16, gap: 14, justifyContent: 'center' },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2, borderWidth: 3, borderColor: '#FFFFFF', ...shadow },
  // Selection is shown by size and ring, never by color alone.
  selected: { transform: [{ scale: 1.15 }], borderWidth: 6, borderColor: colors.ink },
  eraser: { backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  eraserGlyph: { fontSize: 30 },
});
