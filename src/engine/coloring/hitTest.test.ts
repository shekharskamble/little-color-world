import dinoJson from '../../../content/pages/dino-stegosaurus-01.json';
import { ColoringPage } from '../../content/schema/page';
import { fitContain, pageToScreen, screenToPage } from '../geometry/viewTransform';
import { hitTest, prepareRegions } from './hitTest';

const dino = ColoringPage.parse(dinoJson);
const regions = prepareRegions(dino);
const at = (x: number, y: number) => hitTest(regions, { x, y }, 20);

describe('hitTest on the stegosaurus page', () => {
  it.each([
    ['body', 470, 440],
    ['head', 780, 420],
    ['tail', 150, 480],
    ['plate-2', 430, 240],
    ['plate-4', 615, 290],
    ['leg-1', 327, 600],
    ['leg-4', 622, 630],
    ['sun', 880, 130],
    ['cloud', 260, 150],
    ['ground', 500, 700],
    ['sky', 50, 50],
  ])('tap inside %s', (id, x, y) => {
    expect(at(x, y)).toBe(id);
  });

  it('respects draw order: parts hidden under the body resolve to the body', () => {
    // Inside both the tail's base and the body; the body is drawn later (on top).
    expect(at(296, 450)).toBe('body');
    // Inside a plate's base, which is tucked under the body.
    expect(at(430, 340)).toBe('body');
  });

  it('lets taps pass through locked regions', () => {
    expect(at(745, 400)).toBe('head'); // the pupil is locked
  });

  it('maps screen coordinates through the view transform', () => {
    const t = fitContain(1024, 768, 1180, 640, 24); // iPad-ish canvas area
    const screen = pageToScreen(t, { x: 780, y: 420 });
    expect(hitTest(regions, screenToPage(t, screen), 20)).toBe('head');
  });
});

describe('hitTest tolerance', () => {
  const page = ColoringPage.parse({
    schemaVersion: 1,
    id: 'two-boxes',
    version: 1,
    themeId: 't',
    title: 'Two boxes',
    ageBand: '2-3',
    viewBox: [0, 0, 300, 100],
    regions: [
      { id: 'left', d: 'M0 0 H100 V100 H0 Z' },
      { id: 'right', d: 'M200 0 H300 V100 H200 Z' },
    ],
    outline: [{ d: 'M0 0 H100 V100 H0 Z', strokeWidth: 10 }],
  });
  const boxes = prepareRegions(page);

  it('snaps a near miss on the outline to the nearest region', () => {
    expect(hitTest(boxes, { x: 108, y: 50 }, 12)).toBe('left');
    expect(hitTest(boxes, { x: 193, y: 50 }, 12)).toBe('right');
  });

  it('ignores taps on empty background beyond the tolerance', () => {
    expect(hitTest(boxes, { x: 150, y: 50 }, 12)).toBeNull();
  });
});
