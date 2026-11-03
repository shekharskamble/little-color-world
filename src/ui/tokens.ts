// Design tokens (docs/UX.md, "Toy Box" direction). Child-facing touch targets never go below `size.touchMin`.
export const colors = {
  bgApp: '#FFF3D6',
  bgCard: '#FFFFFF',
  mint: '#CFF5E7',
  sky: '#D6ECFF',
  peach: '#FFE0D1',
  lilac: '#E9DFFF',
  lemon: '#FFF3C4',
  ink: '#2A2733',
  inkSoft: '#6E6152',
  accent: '#FF8A3D',
  confirm: '#3DBE6B',
  shadow: '#2A2733',
  /** Hairline borders and the lip under white surfaces. */
  sand: '#E5CF9C',
} as const;

/**
 * Toy Box button tones: `face` is the top surface, `lip` the darker edge
 * underneath that makes a button read as pressable without any text.
 */
export const tones = {
  white: { face: '#FFFFFF', lip: '#E5CF9C', icon: '#2A2733' },
  blue: { face: '#3A7BEB', lip: '#2557B8', icon: '#FFFFFF' },
  yellow: { face: '#FFC93C', lip: '#D9A21A', icon: '#2A2733' },
  green: { face: '#3DBE6B', lip: '#27964F', icon: '#FFFFFF' },
  purple: { face: '#8A5CE6', lip: '#6640B8', icon: '#FFFFFF' },
  orange: { face: '#FF8A1F', lip: '#D16A0C', icon: '#FFFFFF' },
  pink: { face: '#FF6FB1', lip: '#D14A8C', icon: '#FFFFFF' },
  teal: { face: '#19B3B1', lip: '#0E8583', icon: '#FFFFFF' },
} as const;

export type Tone = keyof typeof tones;

/** "Sunny Meadow" backdrop palette (src/ui/SunnyBackdrop.tsx). */
export const scenery = {
  skyTop: '#FFE48F',
  skyBottom: '#FFF2C7',
  sun: '#FFD54A',
  sunLine: '#F2A81D',
  cloud: '#FFFDF5',
  doodle: '#F48FA8',
  hillBack: '#D3E9A2',
  hillFront: '#B4DA7E',
  bushDark: '#5FAE4E',
  bushLight: '#7DC45C',
  bird: '#5B4A6B',
  beeBody: '#FFC93C',
  beeStripe: '#2A2733',
  beeWing: '#FFFFFF',
  beeTrail: '#8A7A5C',
  butterflyPink: '#FF7F8E',
  butterflyPurple: '#A98BE0',
} as const;

export const size = {
  touchMin: 64,
  touchPrimary: 88,
  gap: 16,
  /** Height of the pressable lip under Toy Box buttons and cards. */
  lip: 8,
} as const;

export const radius = {
  card: 36,
  button: 999,
} as const;

/** iOS maps this to SF Pro Rounded; other platforms fall back to the system font. */
export const roundedFont = 'ui-rounded';

export const shadow = {
  shadowColor: colors.shadow,
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
} as const;
