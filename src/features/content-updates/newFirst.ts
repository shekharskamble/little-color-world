/**
 * Items that arrived recently first, newest arrival first; the rest keep their order. `arrived` maps an item's id to
 * when it arrived.
 */
export function newFirst<T>(items: readonly T[], id: (item: T) => string, arrived: ReadonlyMap<string, number>): T[] {
  const fresh = items.filter((x) => arrived.has(id(x)));
  const rest = items.filter((x) => !arrived.has(id(x)));
  // Stable sort: pictures that arrived together keep their pack order.
  return [...fresh.sort((a, b) => arrived.get(id(b))! - arrived.get(id(a))!), ...rest];
}
