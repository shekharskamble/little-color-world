// Design tokens (docs/UX.md). Child-facing touch targets never go below `size.touchMin`.
export const colors = {
  bgApp: '#FFF7EC',
  bgCard: '#FFFFFF',
  mint: '#CFF5E7',
  sky: '#D6ECFF',
  peach: '#FFE0D1',
  lilac: '#E9DFFF',
  lemon: '#FFF3C4',
  ink: '#1E1B2E',
  inkSoft: '#6B6880',
  accent: '#FF8A3D',
  confirm: '#2BB673',
  shadow: '#1E1B2E',
} as const;

export const size = {
  touchMin: 64,
  touchPrimary: 88,
  gap: 16,
} as const;

export const radius = {
  card: 28,
  button: 999,
} as const;

export const shadow = {
  shadowColor: colors.shadow,
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
} as const;
