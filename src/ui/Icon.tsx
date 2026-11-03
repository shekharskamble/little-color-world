import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { View } from 'react-native';

import { ICONS, type IconName } from './icons';
import { colors } from './tokens';

const GRID = 48;

type Props = {
  name: IconName;
  size?: number;
  /** Outline colour, and the colour of any part without its own. */
  color?: string;
  /** Fills parts marked 'accent' in multi-colour icons (the chosen paint colour). */
  accent?: string;
  strokeWidth?: number;
};

/** Decorative vector icon. The surrounding button carries the accessibility label. */
export function Icon({ name, size = 40, color = colors.ink, accent = colors.accent, strokeWidth = 5 }: Props) {
  return (
    <View style={{ width: size, height: size }} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ scale: size / GRID }]}>
          {ICONS[name].map((p, i) => (
            <Path
              key={i}
              path={p.d}
              color={'color' in p ? (p.color === 'accent' ? accent : p.color) : color}
              style={'fill' in p && p.fill ? 'fill' : 'stroke'}
              strokeWidth={strokeWidth}
              strokeCap="round"
              strokeJoin="round"
            />
          ))}
        </Group>
      </Canvas>
    </View>
  );
}
