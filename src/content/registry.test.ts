import { getTheme, listPages, listThemes, themeCover } from './registry';

describe('registry themes', () => {
  it('leaves hidden themes out of the catalog but can still find them', () => {
    expect(listThemes().map((t) => t.id)).not.toContain('shapes');
    expect(getTheme('shapes')?.hidden).toBe(true);
  });

  it('gives every catalog theme a cover page from that theme', () => {
    for (const t of listThemes().filter((x) => listPages(x.id).length > 0)) {
      const cover = themeCover(t);
      expect(cover?.themeId).toBe(t.id);
      if (t.cover) expect(cover?.id).toBe(t.cover);
    }
  });

  it('has no cover for a theme without pages yet', () => {
    const t = { ...getTheme('food')!, id: 'no-pages-yet', cover: undefined };
    expect(themeCover(t)).toBeUndefined();
  });

  it('falls back to the first page when the cover is missing', () => {
    const t = { ...getTheme('animals')!, cover: 'no-such-page' };
    expect(themeCover(t)?.id).toBe(listPages('animals')[0]!.id);
  });
});
