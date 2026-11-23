"""App Store screenshots for iPad 13" (2752 x 2064, landscape): a headline over the real app screen in an iPad frame.

Usage: python3 compose.py <raw dir> <out dir>
Shots whose raw screenshot is not in <raw dir> are skipped, so one or two can be redone without the others.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 2752, 2064
INK = '#2A2733'
SOFT = '#6E6152'
FONT = '/System/Library/Fonts/SFNSRounded.ttf'
RED, ORANGE, GREEN, BLUE, PURPLE, PINK = '#E8453C', '#FF8A1F', '#3DBE6B', '#3A7BEB', '#8A5CE6', '#FF3D8B'

# (file, raw screenshot, headline segments, subline). A segment is (text, colour).
SHOTS = [
    ('01-tap-to-color', 'dino-color', [('Tap to ', INK), ('color!', GREEN)], 'Big, happy pictures made for little hands'),
    ('02-trace', 'trace-letter', [('Trace ', INK), ('letters', BLUE), (' and ', INK), ('numbers', ORANGE)], 'ABC, abc, 123 and shapes, with a guide to follow'),
    ('03-themes', 'catalog', [('500 ', ORANGE), ('pictures to color', INK)], 'Dinosaurs, unicorns, sea animals, space and more'),
    ('04-glitter', 'unicorn-glitter', [('Sparkly ', INK), ('glitter', PURPLE), (' paint', INK)], 'Make every picture shine'),
    ('05-patterns', 'monster-pattern', [('Fun ', INK), ('patterns', PINK)], 'Hearts, stars, stripes, dots and more'),
    ('06-rainbows', 'butterfly-rainbow', [('Rainbow', ORANGE), (' magic', INK)], 'Dreamy rainbow colors in one tap'),
    ('07-trace-color', 'trace-abc', [('Then ', INK), ('color', GREEN), (' them in!', INK)], 'Every letter, number and shape becomes a picture'),
    ('08-brush', 'orca-brush', [('Paint stays ', INK), ('inside the lines', BLUE)], 'Brush, pencil and eraser for little fingers'),
    ('09-save', 'camera', [('Save to ', INK), ('Photos', GREEN)], 'Keep every masterpiece'),
    ('10-for-parents', 'home', [('Made for ', INK), ('ages 2 to 5', PURPLE)], None),
]
BADGES = ['No ads', 'No in-app purchases', 'No tracking', 'Works offline']


def font(size: int, weight: str) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_name(weight)
    return f


def background() -> Image.Image:
    """Warm sunny gradient, like the app's Sunny Meadow sky."""
    top, bottom = (255, 226, 140), (255, 246, 220)
    bg = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return bg


def centered_segments(d: ImageDraw.ImageDraw, segs, f, y: int) -> None:
    widths = [d.textlength(t, font=f) for t, _ in segs]
    x = (W - sum(widths)) / 2
    for (t, c), w in zip(segs, widths):
        d.text((x, y), t, font=f, fill=c)
        x += w


def device(screen: Image.Image, width: int) -> Image.Image:
    """The screenshot in a dark iPad frame with rounded corners."""
    bezel, r_out, r_in = 44, 120, 76
    sw, sh = width - 2 * bezel, round((width - 2 * bezel) * screen.height / screen.width)
    frame = Image.new('RGBA', (width, sh + 2 * bezel), (0, 0, 0, 0))
    m = Image.new('L', frame.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, frame.width - 1, frame.height - 1], r_out, fill=255)
    frame.paste(Image.new('RGBA', frame.size, INK), (0, 0), m)
    s = screen.convert('RGB').resize((sw, sh), Image.LANCZOS)
    sm = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(sm).rounded_rectangle([0, 0, sw - 1, sh - 1], r_in, fill=255)
    frame.paste(s, (bezel, bezel), sm)
    return frame


def badges(d: ImageDraw.ImageDraw, y: int) -> None:
    f = font(64, 'Heavy')
    pad_x, h, gap = 48, 112, 28
    widths = [d.textlength(b, font=f) + 2 * pad_x + 70 for b in BADGES]
    x = (W - sum(widths) - gap * (len(BADGES) - 1)) / 2
    for b, w in zip(BADGES, widths):
        d.rounded_rectangle([x, y, x + w, y + h], h / 2, fill='#FFFFFF', outline='#E5CF9C', width=4)
        # A green tick before each promise.
        cx, cy = x + pad_x + 22, y + h / 2
        d.line([(cx - 20, cy + 2), (cx - 4, cy + 18), (cx + 24, cy - 16)], fill=GREEN, width=12, joint='curve')
        d.text((x + pad_x + 70, y + h / 2), b, font=f, fill=INK, anchor='lm')
        x += w + gap


def compose(raw: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    head = font(150, 'Black')
    sub = font(76, 'Bold')
    for name, src, segs, line in SHOTS:
        if not (raw / f'{src}.png').exists():
            print(f'{name}: skipped (no {src}.png)')
            continue
        img = background()
        d = ImageDraw.Draw(img)
        centered_segments(d, segs, head, 96)
        if line:
            d.text((W / 2, 330), line, font=sub, fill=SOFT, anchor='mm')
        else:
            badges(d, 296)
        dev = device(Image.open(raw / f'{src}.png'), 2240)
        x, y = (W - dev.width) // 2, 450
        shadow = Image.new('RGBA', img.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.rounded_rectangle([x + 10, y + 30, x + dev.width - 10, y + dev.height + 30], 120, fill=(90, 60, 0, 70))
        img.paste(shadow.filter(ImageFilter.GaussianBlur(40)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(40)))
        img.paste(dev, (x, y), dev)
        assert img.size == (W, H) and img.mode == 'RGB'
        img.save(out / f'{name}.png', optimize=True)
        print(name)


if __name__ == '__main__':
    compose(Path(sys.argv[1]), Path(sys.argv[2]))
