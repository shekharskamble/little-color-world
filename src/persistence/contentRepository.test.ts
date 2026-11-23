/** @jest-environment node */
import { openTestDatabase } from '../test-utils/nodeSqlite';
import { listInstalledPacks, loadNewBadges, markPageSeen, markThemeSeen, RECENT_MS, recordInstall, removeInstalledPack } from './contentRepository';
import { migrate } from './migrations';

async function freshDb() {
  const db = openTestDatabase();
  await migrate(db);
  return db;
}

const flowers = [
  { id: 'flower-01', themeId: 'flowers' },
  { id: 'flower-02', themeId: 'flowers' },
];

describe('contentRepository', () => {
  it('records an install and badges its theme and pictures', async () => {
    const db = await freshDb();
    await recordInstall(db, { packId: 'flowers', version: 1, path: 'content/packs/flowers/1', pages: flowers, previousPageIds: [] }, 1000);
    expect(await listInstalledPacks(db)).toEqual([{ packId: 'flowers', version: 1, path: 'content/packs/flowers/1', installedAt: 1000 }]);
    const b = await loadNewBadges(db, 2000);
    expect([...b.themes]).toEqual([['flowers', 1000]]);
    expect([...b.pages].sort()).toEqual(['flower-01', 'flower-02']);
  });

  it('clears the theme badge when the theme opens, and each picture badge when it opens', async () => {
    const db = await freshDb();
    await recordInstall(db, { packId: 'flowers', version: 1, path: 'p', pages: flowers, previousPageIds: [] }, 1000);
    await markThemeSeen(db, 'flowers', 1500);
    let b = await loadNewBadges(db, 2000);
    expect(b.themes.size).toBe(0);
    expect(b.pages.size).toBe(2);
    await markPageSeen(db, 'flower-01', 1600);
    b = await loadNewBadges(db, 2000);
    expect([...b.pages]).toEqual(['flower-02']);
    // A seen picture keeps its place at the front for a while, then falls back into order.
    expect(b.recent.has('flower-01')).toBe(true);
    expect((await loadNewBadges(db, 1000 + RECENT_MS + 1)).recent.has('flower-01')).toBe(false);
  });

  it('badges only the pictures an upgrade adds, and forgets ones it drops', async () => {
    const db = await freshDb();
    await recordInstall(db, { packId: 'flowers', version: 1, path: 'p1', pages: flowers, previousPageIds: [] }, 1000);
    await markThemeSeen(db, 'flowers', 1100);
    await markPageSeen(db, 'flower-01', 1100);
    await markPageSeen(db, 'flower-02', 1100);
    const v2 = [flowers[0]!, { id: 'flower-03', themeId: 'flowers' }];
    await recordInstall(db, { packId: 'flowers', version: 2, path: 'p2', pages: v2, previousPageIds: ['flower-01', 'flower-02'] }, 5000);
    const b = await loadNewBadges(db, 5001);
    expect([...b.themes]).toEqual([['flowers', 5000]]);
    expect([...b.pages]).toEqual(['flower-03']);
    expect(b.recent.has('flower-02')).toBe(false);
    expect((await listInstalledPacks(db))[0]).toMatchObject({ version: 2, path: 'p2' });
  });

  it('removes a pack and its badges', async () => {
    const db = await freshDb();
    await recordInstall(db, { packId: 'flowers', version: 1, path: 'p', pages: flowers, previousPageIds: [] }, 1000);
    await removeInstalledPack(db, 'flowers', ['flower-01', 'flower-02']);
    expect(await listInstalledPacks(db)).toEqual([]);
    expect((await loadNewBadges(db, 2000)).pages.size).toBe(0);
  });
});
