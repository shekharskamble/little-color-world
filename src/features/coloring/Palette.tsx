import { Canvas, Circle } from '@shopify/react-native-skia';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';

import { fillBaseColor, type FillStyle } from '@/content/schema/fill';
import { mixHex, patternFill } from '@/engine/fills/fills';
import { FillDot } from '@/render/FillDot';
import { Icon } from '@/ui/Icon';
import type { IconName } from '@/ui/icons';
import { colors, size } from '@/ui/tokens';

import { RAIL_BASE, RAIL_FIXED, railScale } from './railFit';
import {
  PATTERNS,
  RAINBOWS,
  TODDLER_PALETTE,
  TOOLS,
  TOOL_FINISHES,
  bucketFill,
  finishFor,
  type BrushSize,
  type Finish,
  type Tool,
  type ToolId,
} from './swatches';

export type { Tool } from './swatches';

type Props = { tool: Tool; onChange: (tool: Tool) => void };

/** Paint-kind buttons (plain, glitter, patterns, rainbows) sit in the rail under the tools. */
const TAB = RAIL_BASE.small;
/**
 * Colour board (owner's reference picture, 2026-11-03): a tan board with a golden-brown border holding a column of shiny
 * paint balls. Colours sampled from the reference.
 */
const BALL = 58;
const BOARD_PAD = 8;
const BOARD_EDGE = 4;
const STRIP_W = BALL + BOARD_PAD * 2 + BOARD_EDGE * 2;
const BOARD = '#F6CF92';
const BOARD_BORDER = '#D9A04A';
const BOARD_SHADE = '#B08A58';
/** Tool rail: big round buttons on a light-blue rail, right next to the strip. */
const GAP = 6;
const RAIL_W = 104;
const TOOL_D = RAIL_BASE.tool;
const TOOL_ICON = 74;
/** Dot sizes that show each pen thickness, in the chosen colour. */
const SIZE_DOT: Record<BrushSize, number> = { small: 14, medium: 24, large: 36 };
const SIZES: readonly BrushSize[] = ['small', 'medium', 'large'];
// The same size as the paint buttons; with its ring slot (RING_GROW) the touch target is 70 pt, above size.touchMin.
const SIZE_D = TAB;
const RAIL = '#BFE6F7';

const TOOL_ICONS: Record<ToolId, IconName> = { bucket: 'bucketColor', brush: 'brushColor', pencil: 'crayonColor', eraser: 'eraserColor' };
/** The owner's sticker pictures for the tools (assets/images). The drawn icons are the fallback. */
const TOOL_PICTURES: Partial<Record<ToolId, ImageSourcePropType>> = {
  // Metro bundles images through require.
  bucket: require('../../../assets/images/tool-bucket.png'),
  brush: require('../../../assets/images/tool-brush.png'),
  pencil: require('../../../assets/images/tool-pencil.png'),
  eraser: require('../../../assets/images/tool-eraser.png'),
};
/** The pictures sit fully inside the circle's border, so their sticker edge never covers the ring. */
const TOOL_PICTURE = 64;
const TOOL_LABEL: Record<ToolId, string> = { bucket: 'Paint bucket', brush: 'Brush', pencil: 'Pencil', eraser: 'Eraser' };
/** Unpicked tools keep their own bright paint, so the rail reads as a box of toys. */
const TOOL_OWN_PAINT: Record<ToolId, string> = { bucket: '#FF6FB1', brush: '#3A7BEB', pencil: '#3DBE6B', eraser: '#FF8FB8' };
const FINISH_LABEL: Record<Finish, string> = { plain: 'Colours', glitter: 'Glitter colours', pattern: 'Patterns', rainbow: 'Rainbows' };

export function Palette({ tool, onChange }: Props) {
  // With the eraser picked, the strip and paint buttons still show the paint tool's choices, ready for a colour.
  const finishes = TOOL_FINISHES[tool.paint];
  const finish = finishFor(tool, tool.paint);
  const color = tool.color.fill.color;
  const pickPaint = (patch: Partial<Tool>) => onChange({ ...tool, ...patch, tool: tool.paint });
  const pickTool = (id: ToolId) => onChange({ ...tool, tool: id, ...(id !== 'eraser' && { paint: id }) });
  // What the picked tool paints with, for the size dots.
  const paintColor = fillBaseColor(bucketFill(finish, tool));
  // The rail measures its height and shrinks its buttons to fit without scrolling (src/features/coloring/railFit.ts).
  const [railH, setRailH] = useState(0);
  const k = railScale(railH);
  const toolD = Math.floor(TOOL_D * k);
  const tab = Math.floor(TAB * k);
  const sizeD = Math.floor(SIZE_D * k);
  const round = (d: number) => ({ width: d, height: d, borderRadius: d / 2 });
  const onRailLayout = (e: LayoutChangeEvent) => setRailH(e.nativeEvent.layout.height);

  return (
    <View style={styles.panel}>
      <View style={styles.body}>
        {/* The board is a frame around the scrolling balls, so the gap above the first ball and below the last is the same. */}
        <View style={styles.board}>
          <ScrollView key={finish} style={styles.boardScroll} contentContainerStyle={styles.stripContent} showsVerticalScrollIndicator={false}>
            {finish === 'pattern'
              ? PATTERNS.map((p) => (
                  <Ball key={p} label={`${tool.color.name} ${p}`} fill={patternFill(p, color)} selected={tool.pattern === p} onPress={() => pickPaint({ pattern: p })} />
                ))
              : finish === 'rainbow'
                ? RAINBOWS.map((r) => (
                    <Ball key={r.name} label={r.name} fill={r.fill} selected={tool.rainbow === r.name} onPress={() => pickPaint({ rainbow: r.name })} />
                  ))
                : TODDLER_PALETTE.map((s) => (
                    <Ball
                      key={s.name}
                      label={s.name}
                      fill={bucketFill(finish, { ...tool, color: s })}
                      selected={tool.color.name === s.name}
                      onPress={() => pickPaint({ color: s })}
                    />
                  ))}
          </ScrollView>
        </View>

        {/* Still a ScrollView, but only as a safety net: the buttons are sized so it never needs to scroll. */}
        <ScrollView style={styles.rail} contentContainerStyle={styles.railContent} showsVerticalScrollIndicator={false} onLayout={onRailLayout}>
          {TOOLS.map((id) => {
            const selected = tool.tool === id;
            return (
              <RingButton key={id} label={TOOL_LABEL[id]} selected={selected} size={toolD} onPress={() => pickTool(id)}>
                <View style={[styles.toolButton, round(toolD)]}>
                  {TOOL_PICTURES[id] ? (
                    <Image source={TOOL_PICTURES[id]} style={{ width: TOOL_PICTURE * k, height: TOOL_PICTURE * k }} accessible={false} />
                  ) : (
                    <Icon name={TOOL_ICONS[id]} size={TOOL_ICON * k} accent={selected ? paintColor : TOOL_OWN_PAINT[id]} strokeWidth={3} />
                  )}
                </View>
              </RingButton>
            );
          })}

          {finishes.length > 1 && <View style={styles.railDivider} />}
          {finishes.length > 1 &&
            finishes.map((f) => {
              const selected = f === finish;
              return (
                <RingButton key={f} role="tab" label={FINISH_LABEL[f]} selected={selected} size={tab} onPress={() => pickPaint({ finish: f })}>
                  <View style={[styles.tab, round(tab)]}>
                    <FillDot fill={bucketFill(f, tool)} size={tab - 12} />
                  </View>
                </RingButton>
              );
            })}

          {/* Only the brush has sizes: the pencil is always a fine line. */}
          {tool.tool === 'brush' && <View style={styles.railDivider} />}
          {tool.tool === 'brush' &&
            SIZES.map((sz) => {
              const selected = tool.size === sz;
              const dot = Math.round(SIZE_DOT[sz] * k);
              return (
                <RingButton key={sz} label={`${sz} ${tool.tool}`} selected={selected} size={sizeD} onPress={() => onChange({ ...tool, size: sz })}>
                  <View style={[styles.sizeButton, round(sizeD)]}>
                    {/* The dot is the brush's actual paint (plain or glitter), at that thickness. */}
                    <View style={[styles.sizeDot, { width: dot, height: dot, borderRadius: dot / 2, borderColor: mixHex(paintColor, '#000000', 0.22) }]}>
                      <FillDot fill={bucketFill(finish, tool)} size={dot} />
                    </View>
                  </View>
                </RingButton>
              );
            })}
        </ScrollView>
      </View>
    </View>
  );
}

/**
 * One shiny paint ball on the board: the paint (a plain colour, glitter, a pattern or a rainbow), a darker rim and a
 * white shine at the top left. The chosen ball gets a white gap and an ink ring around it.
 */
function Ball({ label, fill, selected, onPress }: { label: string; fill: FillStyle; selected: boolean; onPress: () => void }) {
  const base = fillBaseColor(fill);
  return (
    <RingButton label={label} selected={selected} size={BALL} gapColor="#FFFFFF" onPress={onPress}>
      <View style={styles.ball}>
        {fill.type === 'solid' ? <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]} /> : <FillDot fill={fill} size={BALL} />}
        <View style={[styles.ballRim, { borderColor: mixHex(base, '#000000', 0.22) }]} />
        <View style={styles.ballShine} />
      </View>
    </RingButton>
  );
}

/** Border width of the rail's round buttons. */
const BUTTON_EDGE = 3;
const RING_GAP = 3;
const RING_W = 4;
/** How much bigger than its item a ring slot is. */
const RING_GROW = (RING_GAP + RING_W) * 2;

/**
 * A round item (diameter `size`) inside a slightly bigger slot that holds the "picked" ring: an ink circle, with an
 * optional `gapColor` circle between ring and item. The ring is drawn with Skia (anti-aliased, exact sizes), because
 * nested iOS rounded borders looked uneven on a real iPad (owner reports 2026-11-03), and it sits inside the slot, so
 * it is never clipped and picking never moves anything. The whole slot is the touch target.
 */
function RingButton({
  label,
  role = 'button',
  selected,
  size: d,
  gapColor,
  onPress,
  children,
}: {
  label: string;
  role?: 'button' | 'tab';
  selected: boolean;
  size: number;
  gapColor?: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const outer = d + RING_GROW;
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.ringSlot, { width: outer, height: outer }]}
    >
      {children}
      {selected && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {gapColor && <Circle cx={outer / 2} cy={outer / 2} r={d / 2 + RING_GAP / 2} style="stroke" strokeWidth={RING_GAP + 1} color={gapColor} />}
          <Circle cx={outer / 2} cy={outer / 2} r={outer / 2 - RING_W / 2} style="stroke" strokeWidth={RING_W} color={colors.ink} />
        </Canvas>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.bgCard,
    borderRadius: 32,
    borderBottomWidth: size.lip,
    borderColor: colors.sand,
    padding: 12,
  },
  // Size and roundness are set from the rail's fit scale.
  tab: {
    borderWidth: BUTTON_EDGE,
    borderColor: '#9FCFE6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  ringSlot: { alignItems: 'center', justifyContent: 'center' },
  // A thin darker rim, like the paint balls, so even a white dot shows on the white button.
  sizeDot: { overflow: 'hidden', borderWidth: 1.5 },
  body: { flex: 1, flexDirection: 'row', gap: GAP },
  railDivider: { width: 56, height: RAIL_FIXED.divider, marginVertical: RAIL_FIXED.dividerMargin, borderRadius: 2, backgroundColor: '#9FCFE6' },
  // The board: tan with a golden-brown border, a darker edge on the right so it reads as a raised wooden board.
  board: {
    width: STRIP_W,
    backgroundColor: BOARD,
    borderWidth: BOARD_EDGE,
    borderColor: BOARD_BORDER,
    borderRightColor: BOARD_SHADE,
    borderBottomColor: BOARD_SHADE,
    borderRadius: 20,
    overflow: 'hidden',
  },
  boardScroll: { flex: 1 },
  // Room between balls so each reads as its own colour and the chosen one can grow without touching its neighbours.
  // Each ball's ring slot already adds RING_GROW, so a small gap leaves about 16 pt between balls.
  stripContent: { paddingVertical: BOARD_PAD, alignItems: 'center', gap: 2 },
  // Selection is shown by size and a ring, never by colour alone (docs/UX.md).
  ball: { width: BALL, height: BALL, borderRadius: BALL / 2, overflow: 'hidden' },
  ballRim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: BALL / 2, borderWidth: 2 },
  ballShine: {
    position: 'absolute',
    left: BALL * 0.2,
    top: BALL * 0.12,
    width: BALL * 0.36,
    height: BALL * 0.2,
    borderRadius: BALL * 0.1,
    backgroundColor: 'rgba(255,255,255,0.65)',
    transform: [{ rotate: '-30deg' }],
  },
  rail: { width: RAIL_W, flexGrow: 0, backgroundColor: RAIL, borderRadius: 28 },
  railContent: { paddingVertical: RAIL_FIXED.padding / 2, alignItems: 'center', gap: 0 },
  // Size and roundness are set from the rail's fit scale.
  toolButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: BUTTON_EDGE,
    borderColor: '#9FCFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Size and roundness are set from the rail's fit scale.
  sizeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: BUTTON_EDGE,
    borderColor: '#9FCFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
