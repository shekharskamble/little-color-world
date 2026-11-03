import type { ColoringPage } from '../../content/schema/page';

import type { FillMap } from './history';

/**
 * The regions a child has to fill for the picture to count as finished: every colourable region except the
 * deliberately small ones (a spot, a ridge), which are easy to miss and should not hold back the celebration.
 */
export function requiredRegionIds(page: ColoringPage): string[] {
  return page.regions.filter((r) => !r.locked && !r.small).map((r) => r.id);
}

/** True when every required region has a fill. A page with nothing required is never "complete". */
export function isComplete(fills: FillMap, required: readonly string[]): boolean {
  return required.length > 0 && required.every((id) => fills[id] !== undefined);
}
