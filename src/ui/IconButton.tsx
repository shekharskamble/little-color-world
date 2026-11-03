import type { StyleProp, ViewStyle } from 'react-native';

import { Icon } from './Icon';
import type { IconName } from './icons';
import { ToyButton } from './ToyButton';
import { size, tones, type Tone } from './tokens';

type Props = {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  diameter?: number;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon, accessibilityLabel, onPress, disabled = false, diameter = 80, tone = 'white', style }: Props) {
  const d = Math.max(diameter, size.touchMin);
  return (
    <ToyButton
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      tone={tone}
      hitSlop={8}
      style={[{ width: d, height: d + size.lip }, style]}
    >
      <Icon name={icon} size={d * (d >= 88 ? 0.56 : 0.5)} color={tones[tone].icon} strokeWidth={d >= 88 ? 6 : d >= 80 ? 5.5 : 4.5} />
    </ToyButton>
  );
}
