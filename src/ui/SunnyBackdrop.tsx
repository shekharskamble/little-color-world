import { Canvas, Circle, DashPathEffect, Group, LinearGradient, Oval, Path, Rect, vec } from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { scenery } from './tokens';

export type Scenery = 'full' | 'sky';

/**
 * "Sunny Meadow" backdrop (docs/UX.md): warm sky, smiling sun, clouds, two soft
 * hills, a bush in each bottom corner, and a few birds, bees, and butterflies.
 * Kept deliberately simple. Drawn as
 * vectors so it is ours to ship, stays sharp on every iPad, and needs no
 * bundled image. `sky` drops the hills and sun for the coloring canvas.
 */
export function SunnyBackdrop({ variant = 'full' }: { variant?: Scenery }) {
  const { width: w, height: h } = useWindowDimensions();
  const full = variant === 'full';
  const u = Math.min(w, h) / 100; // scale unit so shapes keep their proportions

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={w} height={h}>
        <LinearGradient start={vec(0, 0)} end={vec(0, h)} colors={[scenery.skyTop, scenery.skyBottom]} />
      </Rect>

      <Cloud x={w * 0.84} y={h * 0.11} s={u * 1.1} />
      <Cloud x={w * 0.15} y={h * 0.26} s={u * 0.8} />
      {full && <Cloud x={w * 0.95} y={h * 0.52} s={u * 0.7} />}

      {full && (
        <>
          <Sun x={u * 11} y={u * 12} r={u * 5.5} />
          <Path
            path={`M ${w * 0.76} ${h * 0.24} q ${u * 4} ${-u * 5} ${u * 7} 0 t ${u * 7} 0 t ${u * 6} ${u * 2}`}
            style="stroke"
            strokeWidth={u * 0.45}
            strokeCap="round"
            color={scenery.doodle}
          >
            <DashPathEffect intervals={[u * 1, u * 1]} />
          </Path>
          <Bird x={w * 0.25} y={h * 0.07} s={u * 1.5} />
          <Bird x={w * 0.29} y={h * 0.11} s={u * 1} />
          <Bird x={w * 0.725} y={h * 0.06} s={u * 1.2} />
          <Bird x={w * 0.755} y={h * 0.1} s={u * 0.8} />
          <Butterfly x={w * 0.028} y={h * 0.6} s={u * 1.2} wing={scenery.butterflyPurple} />
          <Meadow w={w} h={h} u={u} />
          <Bee x={w * 0.22} y={h - u * 15} s={u * 1.1} trail={`M ${w * 0.22 - u * 3} ${h - u * 15} q ${-u * 4} ${u * 4} ${-u * 1} ${u * 6} t ${-u * 4} ${u * 3}`} />
          <Bee x={w * 0.78} y={h - u * 14} s={u} flip trail={`M ${w * 0.78 + u * 3} ${h - u * 14} q ${u * 4} ${u * 4} ${u * 1} ${u * 6} t ${u * 4} ${u * 3}`} />
          <Butterfly x={w * 0.5} y={h - u * 7} s={u * 0.9} wing={scenery.butterflyPink} />
        </>
      )}
    </Canvas>
  );
}

function Sun({ x, y, r }: { x: number; y: number; r: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    return `M ${x + c * r * 1.45} ${y + s * r * 1.45} L ${x + c * r * 1.9} ${y + s * r * 1.9}`;
  }).join(' ');
  const line = { style: 'stroke' as const, strokeCap: 'round' as const, color: scenery.sunLine };
  return (
    <Group>
      <Path path={rays} strokeWidth={r * 0.16} {...line} />
      <Circle cx={x} cy={y} r={r} color={scenery.sun} />
      <Circle cx={x} cy={y} r={r} strokeWidth={r * 0.12} {...line} />
      <Circle cx={x - r * 0.35} cy={y - r * 0.15} r={r * 0.1} color={scenery.sunLine} />
      <Circle cx={x + r * 0.35} cy={y - r * 0.15} r={r * 0.1} color={scenery.sunLine} />
      <Path path={`M ${x - r * 0.4} ${y + r * 0.2} Q ${x} ${y + r * 0.65} ${x + r * 0.4} ${y + r * 0.2}`} strokeWidth={r * 0.1} {...line} />
    </Group>
  );
}

const CLOUD_PUFFS: [dx: number, dy: number, r: number][] = [
  [-7, 1.5, 4.5],
  [-2, -2, 6],
  [4.5, -0.5, 5],
  [8.5, 2, 3.5],
];

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <Group>
      {CLOUD_PUFFS.map(([dx, dy, r], i) => (
        <Circle key={i} cx={x + dx * s} cy={y + dy * s} r={r * s} color={scenery.cloud} />
      ))}
      {/* Flat cloud base; ends at the outer puffs' centers so no corner pokes out. */}
      <Rect x={x - 7 * s} y={y + 1.5 * s} width={15.5 * s} height={4 * s} color={scenery.cloud} />
    </Group>
  );
}

function Meadow({ w, h, u }: { w: number; h: number; u: number }) {
  const base = h * 0.8;
  return (
    <Group>
      <Path path={`M 0 ${base} Q ${w * 0.25} ${base - u * 9} ${w * 0.5} ${base - u * 2} T ${w} ${base - u * 6} V ${h} H 0 Z`} color={scenery.hillBack} />
      <Path path={`M 0 ${base + u * 7} Q ${w * 0.3} ${base - u * 2} ${w * 0.62} ${base + u * 6} T ${w} ${base + u * 4} V ${h} H 0 Z`} color={scenery.hillFront} />
      <Bush x={0} y={h} u={u * 1.2} />
      <Bush x={w} y={h} u={u * 1.1} />
    </Group>
  );
}

function Bush({ x, y, u }: { x: number; y: number; u: number }) {
  const dir = x === 0 ? 1 : -1;
  const puffs: [dx: number, dy: number, r: number, color: string][] = [
    [2, -6, 9, scenery.bushDark],
    [12, -3, 7, scenery.bushDark],
    [6, -10, 6, scenery.bushLight],
    [16, -8, 4.5, scenery.bushLight],
  ];
  return (
    <Group>
      {puffs.map(([dx, dy, r, c], i) => (
        <Circle key={i} cx={x + dir * dx * u} cy={y + dy * u} r={r * u} color={c} />
      ))}
    </Group>
  );
}

function Bird({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <Path
      path={`M ${x - s * 2} ${y} q ${s} ${-s * 1.3} ${s * 2} 0 q ${s} ${-s * 1.3} ${s * 2} 0`}
      style="stroke"
      strokeWidth={s * 0.4}
      strokeCap="round"
      strokeJoin="round"
      color={scenery.bird}
    />
  );
}

/** A round bee with a dotted flight trail; `flip` makes it face left. */
function Bee({ x, y, s, trail, flip = false }: { x: number; y: number; s: number; trail: string; flip?: boolean }) {
  return (
    <Group>
      <Path path={trail} style="stroke" strokeWidth={s * 0.25} strokeCap="round" color={scenery.beeTrail}>
        <DashPathEffect intervals={[s * 0.1, s * 0.8]} />
      </Path>
      <Group transform={flip ? [{ translateX: 2 * x }, { scaleX: -1 }] : []}>
        <Oval x={x - s * 1.2} y={y - s * 2.6} width={s * 1.6} height={s * 2.2} color={scenery.beeWing} />
        <Oval x={x - s * 0.1} y={y - s * 2.4} width={s * 1.4} height={s * 2} color={scenery.beeWing} />
        <Oval x={x - s * 2} y={y - s * 1.3} width={s * 4} height={s * 2.6} color={scenery.beeBody} />
        <Path
          path={`M ${x - s * 0.6} ${y - s * 1.1} V ${y + s * 1.1} M ${x + s * 0.4} ${y - s * 1.2} V ${y + s * 1.2}`}
          style="stroke"
          strokeWidth={s * 0.45}
          color={scenery.beeStripe}
        />
        <Circle cx={x + s * 1.3} cy={y - s * 0.3} r={s * 0.25} color={scenery.beeStripe} />
        <Path path={`M ${x - s * 2} ${y} l ${-s * 0.6} ${s * 0.2}`} style="stroke" strokeWidth={s * 0.25} strokeCap="round" color={scenery.beeStripe} />
      </Group>
    </Group>
  );
}

function Butterfly({ x, y, s, wing }: { x: number; y: number; s: number; wing: string }) {
  return (
    <Group>
      <Circle cx={x - s * 1.4} cy={y - s} r={s * 1.5} color={wing} />
      <Circle cx={x + s * 1.4} cy={y - s} r={s * 1.5} color={wing} />
      <Circle cx={x - s * 1.1} cy={y + s} r={s} color={wing} />
      <Circle cx={x + s * 1.1} cy={y + s} r={s} color={wing} />
      <Circle cx={x - s * 1.5} cy={y - s * 1.1} r={s * 0.5} color={scenery.cloud} />
      <Circle cx={x + s * 1.5} cy={y - s * 1.1} r={s * 0.5} color={scenery.cloud} />
      <Path
        path={`M ${x} ${y - s * 1.6} V ${y + s * 1.8} M ${x} ${y - s * 1.6} l ${-s * 0.7} ${-s} M ${x} ${y - s * 1.6} l ${s * 0.7} ${-s}`}
        style="stroke"
        strokeWidth={s * 0.35}
        strokeCap="round"
        color={scenery.bird}
      />
    </Group>
  );
}
