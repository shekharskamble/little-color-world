# UX Guidelines

## Principles for ages 2–5
1. **No reading required.** Every child-facing control is an illustration or icon. Text appears only in the Parents Area.
2. **Big, forgiving targets.** Minimum 64×64 pt for child controls (Apple's minimum is 44 pt), 88 pt for primary actions. At least 16 pt spacing between targets.
3. **Nothing punishes.** There are no wrong answers, no fail sounds, and no timers. Mis-taps do nothing or do something harmless.
4. **Shallow navigation.** At most 3 taps from Home to any canvas. Back is always in the same top-left spot.
5. **Calm, not frantic.** Gentle spring animations (200–400 ms), soft pastel backgrounds, bright fills, no flashing (WCAG 2.3.1).
6. **Immediate feedback.** Each fill gives a fill animation (radial reveal, about 250 ms), an optional soft sound, and a light haptic.
7. **Accidental-touch resistant.** Ignore palm and multi-finger touches on the canvas. Destructive actions (Reset) need a confirm step a toddler is unlikely to complete by accident (press and hold, or two-step).
8. **Parents stay in control.** Settings, deletion, and any external link sit behind the parental gate. Downloads in New Pictures are child-accessible (decision D7), but never automatic.

## Layout: Coloring Canvas (landscape iPad)
```
┌───────────────────────────────────────────────────────────────┐
│ [◀ Back]                                 [↶] [↷] [⟲ reset]    │  top bar, 72pt
│ ┌─────┐  ┌───────────────────────────────────────┐  ┌──────┐  │
│ │fill │  │                                       │  │color │  │
│ │type │  │            CANVAS (max area)          │  │palette│ │
│ │ ●   │  │                                       │  │ ● ● ● │ │
│ │ ◐   │  │                                       │  │ ● ● ● │ │
│ │ ▦   │  │                                       │  │ ● ● ● │ │
│ │ ✎   │  │                                       │  │ ● ● ● │ │
│ │ ⌫   │  └───────────────────────────────────────┘  │ eraser│ │
│ └─────┘                                             └──────┘  │
└───────────────────────────────────────────────────────────────┘
```
- The left rail selects fill type (solid, gradient, pattern, texture). The right rail shows swatches of the selected type. The eraser sits on the right rail as a distinct swatch.
- The selected swatch grows 1.15× and gets a white ring plus a drop shadow (selection must never be shown by color alone).
- Phase 1 shows only solid colors and the eraser. The fill-type rail appears in Phase 2.

## Reset confirmation
Tapping ⟲ opens an in-app sheet (not a system alert) with a large picture of the blank page and a green ✓ the child must **press and hold for 1.5 s** (a filling ring shows progress), plus an ✕. Reset is also undoable, so an accidental reset can be recovered.

## Palette
- 12 to 16 solid swatches for ages 2–3, chosen for high saturation and distinctness, including skin tones and brown/black/white.
- Contrast: every swatch must stay distinguishable against the white page and the pastel UI.

## Color tokens (draft)
| Token | Value | Use |
|---|---|---|
| `bg.app` | `#FFF7EC` | warm cream background |
| `bg.card` | `#FFFFFF` | cards |
| `tint.mint` | `#CFF5E7` | theme card tint |
| `tint.sky` | `#D6ECFF` | theme card tint |
| `tint.peach` | `#FFE0D1` | theme card tint |
| `tint.lilac` | `#E9DFFF` | theme card tint |
| `ink` | `#1E1B2E` | outlines, icons |
| `accent` | `#FF8A3D` | primary actions |
Radii: cards 28 pt, buttons fully rounded. Typography (Parents Area only): system font, Dynamic Type supported.

## Sound and haptics
- Sounds are off by default, toggled in the Parents Area, and respect the iPad silent switch.
- Light haptic on fill and medium on completion, where supported (most iPads have no Taptic Engine, so this must degrade silently).

## Celebrations (Phase 4)
Completion is reached when a configured share of fillable regions, such as 80%, is colored, or when the child taps a ★ "done" button. It triggers a short confetti animation (under 2 s, no strobing), a star, and occasionally a sticker. Rewards are never withheld and never tied to time.

## Parental gate
- Shown before the Parents Area and any outbound link. **New Pictures is not gated** (decision D7).
- A multiplication question with a number pad (for example, "7 × 6"), randomized each time. This is the pattern Apple reviewers commonly accept, and children aged 2–5 cannot pass it.
- The gate never blocks child activities.

## Accessibility
- VoiceOver labels on all controls (helps parents and accessibility review).
- Reduce Motion is respected: celebrations become fades.
- Left-handed option (mirror the rails) in the Parents Area, Phase 7.
