// Draws the app icon (concept B, chosen by the owner 2026-11-03): the Spotty Hugger monster (content/pages/monster-08,
// from the Cute Monsters pack) coloured in, on sunny rays. Writes the iOS icon, the Android adaptive layers and the
// web favicon into assets/.
//   npx tsx tools/app-icon/generate.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

import CanvasKitInit, { type Canvas, type CanvasKit } from 'canvaskit-wasm';

const ROOT = join(__dirname, '../..');
const PAGE = join(ROOT, 'content/pages/monster-08.json');

/** Colours for the monster's parts (ids from the debug preview, art/previews/monster-08.debug.png). */
const COLORS: Record<string, string> = {
  'part-1': '#4CC9F0', // body
  'part-2': '#FFB3D1', // tummy
  'part-3': '#4CC9F0', // feet
  'part-4': '#4CC9F0',
  'part-7': '#E8453C', // mouth
  'part-10': '#FFB3D1', // foot pads
  'part-11': '#FFB3D1',
  'part-5': '#FF8A1F', // horn stripes, orange and white
  'part-6': '#FF8A1F',
  'part-8': '#FFFFFF',
  'part-9': '#FFFFFF',
  'part-17': '#FFFFFF',
  'part-18': '#FF8A1F',
  'part-12': '#FFC93C', // spots
  'part-13': '#FF6FB1',
  'part-14': '#3DBE6B',
  'part-15': '#8A5CE6',
  'part-16': '#FFC93C',
  'part-19': '#FF6FB1',
};

async function main() {
  const ck: CanvasKit = await CanvasKitInit({ locateFile: (f: string) => require.resolve(`canvaskit-wasm/bin/${f}`) });
  const page = JSON.parse(readFileSync(PAGE, 'utf8')) as { regions: { id: string; d: string; fillRule?: string; defaultFill?: { color: string } }[] };
  const paint = (hex: string) => {
    const p = new ck.Paint();
    p.setAntiAlias(true);
    p.setColor(ck.parseColorString(hex));
    return p;
  };

  /** Sunny Meadow rays (docs/UX.md) filling a 1024 square. */
  const sunny = (cv: Canvas) => {
    const bg = paint('#FFD54A');
    bg.setShader(ck.Shader.MakeRadialGradient([512, 512], 820, [ck.parseColorString('#FFF2C7'), ck.parseColorString('#FFD54A')], [0, 1], ck.TileMode.Clamp));
    cv.drawRect(ck.XYWHRect(0, 0, 1024, 1024), bg);
    const ray = paint('#FFFFFF');
    ray.setAlphaf(0.28);
    for (let i = 0; i < 16; i += 2) {
      const a0 = (i / 16) * Math.PI * 2;
      const a1 = ((i + 1) / 16) * Math.PI * 2;
      const d = `M512 512 L${512 + Math.cos(a0) * 1230} ${512 + Math.sin(a0) * 1230} L${512 + Math.cos(a1) * 1230} ${512 + Math.sin(a1) * 1230} Z`;
      cv.drawPath(ck.Path.MakeFromSVGString(d)!, ray);
    }
  };

  /** The coloured monster, scaled by `s` around (cx, cy). The page's dark artwork region is its outline. */
  const monster = (cv: Canvas, s: number, cx: number, cy: number) => {
    cv.save();
    cv.translate(cx - 512 * s, cy - 390 * s);
    cv.scale(s, s);
    for (const r of page.regions) {
      if (r.id === 'background') continue;
      const p = ck.Path.MakeFromSVGString(r.d)!;
      if (r.fillRule === 'evenodd') p.setFillType(ck.FillType.EvenOdd);
      cv.drawPath(p, paint(r.defaultFill?.color ?? COLORS[r.id] ?? '#FFFFFF'));
    }
    cv.restore();
  };

  const write = (file: string, size: number, opaque: boolean, draw: (cv: Canvas) => void) => {
    const surface = ck.MakeSurface(size, size)!;
    const cv = surface.getCanvas();
    cv.clear(ck.TRANSPARENT);
    draw(cv);
    // The App Store rejects icons with an alpha channel, so the iOS icon is written as plain RGB.
    const bytes = opaque
      ? rgbPng(cv.readPixels(0, 0, { width: size, height: size, colorType: ck.ColorType.RGBA_8888, alphaType: ck.AlphaType.Unpremul, colorSpace: ck.ColorSpace.SRGB }) as Uint8Array, size)
      : surface.makeImageSnapshot().encodeToBytes()!;
    writeFileSync(join(ROOT, 'assets', file), bytes);
    surface.delete();
    console.log(`wrote assets/${file}`);
  };

  write('icon.png', 1024, true, (cv) => {
    sunny(cv);
    monster(cv, 1.32, 512, 532);
  });
  write('favicon.png', 48, false, (cv) => {
    cv.scale(48 / 1024, 48 / 1024);
    sunny(cv);
    monster(cv, 1.32, 512, 532);
  });
  // Android crops adaptive icons to the middle 72 of 108 units (a circle on some launchers), so the monster is smaller.
  write('android-icon-background.png', 512, false, (cv) => {
    cv.scale(0.5, 0.5);
    sunny(cv);
  });
  write('android-icon-foreground.png', 512, false, (cv) => monster(cv, 0.36, 256, 262));
  write('android-icon-monochrome.png', 432, false, (cv) => monster(cv, 0.304, 216, 221));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** An 8-bit RGB PNG (no alpha channel) from RGBA pixels. */
function rgbPng(rgba: Uint8Array, size: number): Buffer {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = rgba[i]!;
      raw[o + 1] = rgba[i + 1]!;
      raw[o + 2] = rgba[i + 2]!;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

if (require.main === module) void main();
