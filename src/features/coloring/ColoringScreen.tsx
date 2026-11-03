import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import type { FillStyle } from "@/content/schema/fill";
import type { ColoringPage } from "@/content/schema/page";
import { isComplete, requiredRegionIds } from "@/engine/coloring/completion";
import {
  canRedo,
  canUndo,
  isBlank,
  type Stroke,
} from "@/engine/coloring/history";
import { IconButton } from "@/ui/IconButton";
import { RainbowTitle } from "@/ui/RainbowTitle";
import { Screen } from "@/ui/Screen";
import { ToyButton } from "@/ui/ToyButton";
import { colors, radius, size } from "@/ui/tokens";

import { CelebrationLayer, type Celebration } from "./Celebration";
import { popStars, showerStars } from "./celebrationStars";
import { ColoringCanvas } from "./ColoringCanvas";
import { Palette, type Tool } from "./Palette";
import { BRUSH_WIDTH, INITIAL_TOOL, PENCIL_WIDTH, bucketFill, finishFor, strokePen } from "./swatches";
import { ResetSheet } from "./ResetSheet";
import { SnapshotSheet } from "./SnapshotSheet";
import { useColoringSession } from "./useColoringSession";

/** The card's 3D lip, the same as the palette panel's so their bottoms line up. */
const CARD_LIP = size.lip;
const POP_MS = 1000;
/** Rubbing-eraser thickness in page units: wider than the big brush so it is easy to rub paint away. */
const ERASER_WIDTH = 56;
/** Top-bar buttons: big, and each its own bright colour so a child can tell them apart without reading. */
const TOP_BUTTON = size.touchPrimary;
const SHOWER_MS = 2600;
// Metro bundles images through require.
const CAMERA_PICTURE = require("../../../assets/images/camera.png");

// Most iPads have no haptic engine; the calls are harmless there.
const haptic = {
  light: () =>
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () =>
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => {},
    ),
  success: () =>
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {}),
};

let nextKey = 1;

/** What a pen stroke's stars look like: glittery for the glitter pen, the stroke's colour otherwise. */
const strokeStarFill = (stroke: Stroke): FillStyle =>
  stroke.pen === "glitter"
    ? { type: "texture", textureId: "glitter", color: stroke.color }
    : { type: "solid", color: stroke.color };

export function ColoringScreen({ page }: { page: ColoringPage }) {
  const { state, dispatch, ready } = useColoringSession(page);
  const [tool, setTool] = useState<Tool>(INITIAL_TOOL);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [snapping, setSnapping] = useState(false);

  const required = useMemo(() => requiredRegionIds(page), [page]);
  const reduceMotion = useReducedMotion();
  const screen = useWindowDimensions();
  const [pops, setPops] = useState<Celebration[]>([]);
  const [shower, setShower] = useState<Celebration[]>([]);
  const donePop = useCallback(
    (key: number) => setPops((p) => p.filter((c) => c.key !== key)),
    [],
  );
  const doneShower = useCallback(() => setShower([]), []);

  // Stars are painted with whatever the child just used: a colour, pattern, rainbow, gloss or glitter.
  const pop = (at: { x: number; y: number }, fill: FillStyle) =>
    setPops((p) => [
      ...p,
      {
        key: nextKey++,
        stars: popStars(at.x, at.y, reduceMotion, fill),
        duration: POP_MS,
      },
    ]);

  const onRegionTap = (regionId: string, at: { x: number; y: number }) => {
    // A tap with a pen selected never reaches here: the canvas paints a dot instead.
    if (tool.tool === "eraser") {
      dispatch({ type: "erase", regionId });
      haptic.light();
      return;
    }
    const fill = bucketFill(finishFor(tool, "bucket"), tool);
    dispatch({ type: "fill", regionId, fill });
    // Every fill (and brush stroke) gets a star pop; finishing the whole picture gets the big shower. It fires only on the
    // child's own fill that completes it, never on load, undo or redo.
    pop(at, fill);
    const finished =
      !isComplete(state.fills, required) &&
      isComplete({ ...state.fills, [regionId]: fill }, required);
    if (finished) {
      setShower([
        {
          key: nextKey++,
          stars: showerStars(screen.width, screen.height, reduceMotion, fill),
          duration: SHOWER_MS,
        },
      ]);
      haptic.success();
    } else {
      haptic.light();
    }
  };
  const onStroke = (stroke: Stroke, at: { x: number; y: number }, rubbed: readonly string[]) => {
    if (stroke.erase) {
      // One undo step: rubs out brush paint under the finger and clears the bucket colour of every part it crossed.
      // The reducer ignores a rub over nothing coloured.
      dispatch({ type: "stroke", stroke, clearFills: rubbed });
      haptic.light();
      return;
    }
    dispatch({ type: "stroke", stroke });
    pop(at, strokeStarFill(stroke));
    haptic.light();
  };
  // The eraser drags like a brush (rubbing out paint and the colour of parts it crosses); a tap clears one part.
  const brush =
    tool.tool === "eraser"
      ? { color: "#000000", width: ERASER_WIDTH, erase: true }
      : tool.tool === "brush" || tool.tool === "pencil"
        ? {
            color: tool.color.fill.color,
            width: tool.tool === "pencil" ? PENCIL_WIDTH : BRUSH_WIDTH[tool.size],
            pen: strokePen(tool, tool.tool),
          }
        : null;

  // Camera: a quick white flash over the picture, a firm tap, then the photo preview.
  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));
  const takePhoto = () => {
    flash.set(
      withSequence(
        withTiming(0.9, { duration: 60 }),
        withTiming(0, { duration: 320 }),
      ),
    );
    haptic.medium();
    setTimeout(() => setSnapping(true), 220);
  };
  const closeSnapshot = useCallback(() => setSnapping(false), []);

  return (
    <Screen
      scenery="sky"
      overlay={<CelebrationLayer items={shower} onDone={doneShower} />}
    >
      <View style={styles.topBar}>
        <IconButton
          icon="back"
          tone="blue"
          accessibilityLabel="Back"
          diameter={TOP_BUTTON}
          // Back always goes up one level (this picture's theme), however many pictures were opened.
          onPress={() => router.dismissTo({ pathname: "/themes/[themeId]", params: { themeId: page.themeId } })}
        />
        {/* The picture's name, for a grown-up to read aloud (docs/UX.md: text is never the only cue). */}
        <View style={styles.title}>
          <RainbowTitle title={page.title} subtitle={page.subtitle} />
        </View>
        <View style={styles.topActions}>
          {/* The owner's yellow toy-camera picture (assets/images/camera.png) on the pink button. */}
          <ToyButton
            tone="pink"
            accessibilityLabel="Take a photo of my picture"
            disabled={!ready}
            onPress={takePhoto}
            hitSlop={8}
            style={styles.cameraButton}
          >
            <Image source={CAMERA_PICTURE} style={styles.cameraPicture} accessible={false} />
          </ToyButton>
          <IconButton
            icon="undo"
            tone="orange"
            diameter={TOP_BUTTON}
            accessibilityLabel="Undo"
            disabled={!canUndo(state)}
            onPress={() => dispatch({ type: "undo" })}
          />
          <IconButton
            icon="redo"
            tone="purple"
            diameter={TOP_BUTTON}
            accessibilityLabel="Redo"
            disabled={!canRedo(state)}
            onPress={() => dispatch({ type: "redo" })}
          />
          <IconButton
            icon="reset"
            tone="teal"
            diameter={TOP_BUTTON}
            accessibilityLabel="Start over"
            disabled={isBlank(state)}
            onPress={() => setConfirmingReset(true)}
          />
        </View>
      </View>
      <View style={styles.body}>
        {/* The card fills the space beside the palette, top to bottom; the page is centred inside it. */}
        <View style={styles.canvasCard}>
          <ColoringCanvas
            page={page}
            fills={state.fills}
            strokes={state.strokes}
            enabled={ready}
            brush={brush}
            onRegionTap={onRegionTap}
            onStroke={onStroke}
          />
          <CelebrationLayer items={pops} onDone={donePop} />
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.flash, flashStyle]}
          />
        </View>
        <Palette tool={tool} onChange={setTool} />
      </View>
      <ResetSheet
        visible={confirmingReset}
        page={page}
        onCancel={() => setConfirmingReset(false)}
        onConfirm={() => {
          dispatch({ type: "reset" });
          setConfirmingReset(false);
        }}
      />
      {snapping && (
        <SnapshotSheet
          page={page}
          fills={state.fills}
          strokes={state.strokes}
          onClose={closeSnapshot}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
    marginBottom: 16,
  },
  title: { flex: 1, minWidth: 0 },
  topActions: { flexDirection: "row", gap: 20 },
  cameraButton: { width: TOP_BUTTON, height: TOP_BUTTON + size.lip },
  // A full-colour picture reads best a little bigger than the line icons.
  cameraPicture: { width: TOP_BUTTON * 0.66, height: TOP_BUTTON * 0.66 },
  body: { flex: 1, flexDirection: "row", gap: 24 },
  canvasCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.card + 4,
    borderBottomWidth: CARD_LIP,
    borderColor: colors.sand,
    overflow: "hidden",
  },
  flash: { backgroundColor: "#FFFFFF" },
});
