import { Image, Pressable, ScrollView, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { fillBaseColor, type FillStyle } from '@/content/schema/fill';
import { mixHex, patternFill } from '@/engine/fills/fills';
import { FillDot } from '@/render/FillDot';
import { Icon } from '@/ui/Icon';
import type { IconName } from '@/ui/icons';
import { colors, size } from '@/ui/tokens';

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
const TAB = 56;
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
const TOOL_D = 84;
const TOOL_ICON = 74;
/** Dot sizes that show each pen thickness, in the chosen colour. */
const SIZE_DOT: Record<BrushSize, number> = { small: 12, medium: 20, large: 30 };
const SIZES: readonly BrushSize[] = ['small', 'medium', 'large'];
const RAIL = '#BFE6F7';
const LIGHT_EDGE = '#D8D2C4';

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

        <ScrollView style={styles.rail} contentContainerStyle={styles.railContent} showsVerticalScrollIndicator={false}>
          {TOOLS.map((id) => {
            const selected = tool.tool === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={TOOL_LABEL[id]}
                accessibilityState={{ selected }}
                onPress={() => pickTool(id)}
                style={[styles.toolButton, selected && styles.toolSelected]}
              >
                {TOOL_PICTURES[id] ? (
                  <Image source={TOOL_PICTURES[id]} style={styles.toolPicture} accessible={false} />
                ) : (
                  <Icon name={TOOL_ICONS[id]} size={TOOL_ICON} accent={selected ? paintColor : TOOL_OWN_PAINT[id]} strokeWidth={3} />
                )}
              </Pressable>
            );
          })}

          {finishes.length > 1 && <View style={styles.railDivider} />}
          {finishes.length > 1 &&
            finishes.map((f) => {
              const selected = f === finish;
              return (
                <Pressable
                  key={f}
                  accessibilityRole="tab"
                  accessibilityLabel={FINISH_LABEL[f]}
                  accessibilityState={{ selected }}
                  onPress={() => pickPaint({ finish: f })}
                  style={[styles.tab, selected && styles.tabSelected]}
                >
                  <FillDot fill={bucketFill(f, tool)} size={TAB - 12} />
                </Pressable>
              );
            })}

          {/* Only the brush has sizes: the pencil is always a fine line. */}
          {tool.tool === 'brush' && <View style={styles.railDivider} />}
          {tool.tool === 'brush' &&
            SIZES.map((sz) => {
              const selected = tool.size === sz;
              const dot = SIZE_DOT[sz];
              return (
                <Pressable
                  key={sz}
                  accessibilityRole="button"
                  accessibilityLabel={`${sz} ${tool.tool}`}
                  accessibilityState={{ selected }}
                  onPress={() => onChange({ ...tool, size: sz })}
                  style={[styles.sizeButton, selected && styles.sizeSelected]}
                >
                  <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: paintColor, borderWidth: 2, borderColor: paintColor === '#FFFFFF' ? LIGHT_EDGE : paintColor }} />
                </Pressable>
              );
            })}
        </ScrollView>
      </View>
    </View>
  );
}

/**
 * One shiny paint ball on the board: the paint (a plain colour, glitter, a pattern or a rainbow), a darker rim and a
 * white shine at the top left. The chosen ball grows a little and gets a white rim and an ink ring.
 */
function Ball({ label, fill, selected, onPress }: { label: string; fill: FillStyle; selected: boolean; onPress: () => void }) {
  const base = fillBaseColor(fill);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={[styles.ballSlot, selected && styles.ballSelected]}>
      <View style={styles.ball}>
        {fill.type === 'solid' ? <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]} /> : <FillDot fill={fill} size={BALL} />}
        <View style={[styles.ballRim, { borderColor: mixHex(base, '#000000', 0.22) }]} />
        <View style={styles.ballShine} />
      </View>
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
  tab: {
    width: TAB,
    height: TAB,
    borderRadius: TAB / 2,
    borderWidth: 3,
    borderColor: '#9FCFE6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tabSelected: { borderWidth: 4, borderColor: colors.ink, transform: [{ scale: 1.08 }] },
  body: { flex: 1, flexDirection: 'row', gap: GAP },
  railDivider: { width: 56, height: 3, borderRadius: 2, backgroundColor: '#9FCFE6' },
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
  stripContent: { paddingVertical: BOARD_PAD + 4, alignItems: 'center', gap: 16 },
  ballSlot: { width: BALL, height: BALL, borderRadius: BALL / 2 },
  // Selection is shown by size and a ring, never by colour alone (docs/UX.md).
  ballSelected: { borderWidth: 4, borderColor: '#FFFFFF', outlineWidth: 3, outlineColor: colors.ink, outlineStyle: 'solid', transform: [{ scale: 1.1 }], zIndex: 1 },
  ball: { flex: 1, borderRadius: BALL / 2, overflow: 'hidden' },
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
  railContent: { paddingVertical: 12, alignItems: 'center', gap: 12 },
  toolButton: {
    width: TOOL_D,
    height: TOOL_D,
    borderRadius: TOOL_D / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#9FCFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolPicture: { width: TOOL_PICTURE, height: TOOL_PICTURE },
  // The picked ring is drawn outside the circle (border + outline), so it never shrinks the space for the picture.
  toolSelected: { borderColor: colors.ink, outlineWidth: 3, outlineColor: colors.ink, outlineStyle: 'solid' },
  sizeButton: {
    width: size.touchMin + 8,
    height: size.touchMin + 8,
    borderRadius: (size.touchMin + 8) / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#9FCFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSelected: { borderWidth: 5, borderColor: colors.ink },
});
