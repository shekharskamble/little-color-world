// Little Color World content CLI (docs/ARTWORK_PIPELINE.md).
//   npm run lcw -- page import art/svg/animals/elephant-01.svg --theme animals [--id] [--title] [--subtitle] [--age 2-3] [--allow-removed]
//   npm run lcw -- page validate [content/pages/x.json ...]
//   npm run lcw -- page preview <id|file.json>
//   npm run lcw -- page export-svg <id|file.json> [--out file.svg]
//   npm run lcw -- index

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

import { AgeBand, ColoringPage, Theme } from '../../src/content/schema/page';
import { validatePage, type Issue } from '../../src/content/schema/validatePage';

import { renderPreviews } from './preview';
import { exportSvg, importSvg } from './svgPage';

const ROOT = resolve(__dirname, '../..');
const PAGES_DIR = join(ROOT, 'content/pages');
const PREVIEWS_DIR = join(ROOT, 'art/previews');
const INDEX_FILE = join(ROOT, 'src/content/bundledPages.ts');
const PAGE_ID = /^[a-z0-9][a-z0-9-]{1,63}$/;

class UsageError extends Error {}

async function main(argv: string[]): Promise<number> {
  const { positional, flags } = parseArgs(argv);
  const [group, command, target] = positional;
  if (group === 'index') return writeIndex();
  if (group !== 'page') throw new UsageError('Unknown command');
  switch (command) {
    case 'import':
      return importCommand(required(target, 'SVG file'), flags);
    case 'validate':
      return validateCommand(positional.slice(2));
    case 'preview':
      return previewCommand(required(target, 'page id or JSON file'));
    case 'export-svg':
      return exportCommand(required(target, 'page id or JSON file'), flags);
    default:
      throw new UsageError('Unknown page command');
  }
}

async function importCommand(svgFile: string, flags: Flags): Promise<number> {
  const svgPath = resolve(svgFile);
  if (!existsSync(svgPath)) throw new UsageError(`No such file: ${svgFile}`);
  const id = str(flags.id) ?? basename(svgPath, '.svg').toLowerCase();
  if (!PAGE_ID.test(id)) throw new UsageError(`Page id "${id}" must be lowercase letters, digits and "-" (use --id)`);

  const outFile = join(PAGES_DIR, `${id}.json`);
  const previous = existsSync(outFile) ? ColoringPage.parse(JSON.parse(readFileSync(outFile, 'utf8'))) : null;
  const themeId = str(flags.theme) ?? previous?.themeId;
  if (!themeId) throw new UsageError('--theme is required for a new page (e.g. --theme animals)');
  const ageBand = AgeBand.parse(str(flags.age) ?? previous?.ageBand ?? '2-3');
  const title = str(flags.title) ?? previous?.title ?? humanize(id);
  const subtitle = str(flags.subtitle) ?? previous?.subtitle;

  const result = importSvg(readFileSync(svgPath, 'utf8'), { id, themeId, title, subtitle, ageBand, version: (previous?.version ?? 0) + 1 });
  const issues = [...result.issues, ...themeIssues(themeId)];
  let page = result.page;
  if (page) {
    const validation = validatePage(page);
    issues.push(...validation.issues);
    if (validation.ok) page = validation.page; // schema-ordered keys, so the unchanged check below is exact
    if (previous) {
      const kept = new Set(page.regions.map((r) => r.id));
      const removed = previous.regions.filter((r) => !r.locked && !kept.has(r.id)).map((r) => r.id);
      if (removed.length > 0) {
        issues.push({
          severity: flags['allow-removed'] ? 'warning' : 'error',
          path: 'regions',
          message: `Region ids removed since version ${previous.version}: ${removed.join(', ')}. Saved colorings use these ids; rename them back, or pass --allow-removed.`,
        });
      }
      if (formatPage({ ...page, version: previous.version }) === formatPage(previous)) page = previous;
    }
  }

  report(relative(ROOT, svgPath), issues);
  if (!page || issues.some((i) => i.severity === 'error')) {
    console.log('\nNothing was written. Fix the errors above and run the import again.');
    return 1;
  }

  const unchanged = page === previous;
  if (!unchanged) writeFileSync(outFile, formatPage(page));
  writeIndex(true);
  const previews = await writePreviews(page);
  const fillable = page.regions.filter((r) => !r.locked).length;
  console.log(
    `\n${unchanged ? 'No changes' : `Wrote ${relative(ROOT, outFile)} (version ${page.version})`}: ` +
      `${fillable} fillable regions, ${page.regions.length - fillable} details, ${page.outline.length} outline groups.`,
  );
  console.log(`Previews: ${previews.map((p) => relative(ROOT, p)).join(', ')}`);
  return 0;
}

function validateCommand(files: string[]): number {
  const targets = files.length > 0 ? files.map((f) => resolve(f)) : pageFiles();
  let failed = 0;
  for (const file of targets) {
    const validation = validatePage(JSON.parse(readFileSync(file, 'utf8')));
    const issues = [...validation.issues];
    if (validation.ok) issues.push(...themeIssues(validation.page.themeId));
    report(relative(ROOT, file), issues);
    if (issues.some((i) => i.severity === 'error')) failed++;
  }
  console.log(`\n${targets.length - failed}/${targets.length} pages valid.`);
  return failed > 0 ? 1 : 0;
}

async function previewCommand(target: string): Promise<number> {
  const files = await writePreviews(loadPage(target));
  console.log(`Previews: ${files.map((p) => relative(ROOT, p)).join(', ')}`);
  return 0;
}

function exportCommand(target: string, flags: Flags): number {
  const page = loadPage(target);
  const out = resolve(str(flags.out) ?? join(ROOT, 'art/svg', page.themeId, `${page.id}.svg`));
  if (existsSync(out)) throw new UsageError(`${relative(ROOT, out)} already exists; pass --out to choose another file`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, exportSvg(page));
  console.log(`Wrote ${relative(ROOT, out)}`);
  return 0;
}

/** Regenerates src/content/bundledPages.ts from content/pages/*.json. */
function writeIndex(quiet = false): number {
  const ids = pageFiles().map((f) => basename(f, '.json'));
  const ident = (id: string) => `page_${id.replace(/-/g, '_')}`;
  const source = [
    '// Generated by `npm run lcw -- index` (tools/lcw/cli.ts) from content/pages/*.json. Do not edit by hand.',
    ...ids.map((id) => `import ${ident(id)} from '../../content/pages/${id}.json';`),
    '',
    'export const BUNDLED_PAGES: Readonly<Record<string, unknown>> = {',
    ...ids.map((id) => `  '${id}': ${ident(id)},`),
    '};',
    '',
  ].join('\n');
  const current = existsSync(INDEX_FILE) ? readFileSync(INDEX_FILE, 'utf8') : '';
  if (current !== source) writeFileSync(INDEX_FILE, source);
  if (!quiet) console.log(`${relative(ROOT, INDEX_FILE)}: ${ids.length} pages`);
  return 0;
}

async function writePreviews(page: ColoringPage): Promise<string[]> {
  mkdirSync(PREVIEWS_DIR, { recursive: true });
  const { blank, debug } = await renderPreviews(page);
  const files = [join(PREVIEWS_DIR, `${page.id}.png`), join(PREVIEWS_DIR, `${page.id}.debug.png`)];
  writeFileSync(files[0]!, blank);
  writeFileSync(files[1]!, debug);
  return files;
}

function loadPage(target: string): ColoringPage {
  const file = target.endsWith('.json') ? resolve(target) : join(PAGES_DIR, `${target}.json`);
  if (!existsSync(file)) throw new UsageError(`No such page: ${target}`);
  return ColoringPage.parse(JSON.parse(readFileSync(file, 'utf8')));
}

function themeIssues(themeId: string): Issue[] {
  const themes = Theme.array().parse(JSON.parse(readFileSync(join(ROOT, 'content/themes.json'), 'utf8')));
  return themes.some((t) => t.id === themeId)
    ? []
    : [{ severity: 'error', path: 'themeId', message: `Unknown theme "${themeId}". Known: ${themes.map((t) => t.id).join(', ')}` }];
}

function pageFiles(): string[] {
  return readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(PAGES_DIR, f));
}

/** Pretty JSON with one region / outline per line, matching the hand-written pages. */
function formatPage(page: ColoringPage): string {
  const lines = Object.entries(page).map(([key, value]) => {
    if (Array.isArray(value) && (key === 'regions' || key === 'outline')) {
      return `  "${key}": [\n${value.map((v) => `    ${JSON.stringify(v)}`).join(',\n')}\n  ]`;
    }
    return `  "${key}": ${JSON.stringify(value)}`;
  });
  return `{\n${lines.join(',\n')}\n}\n`;
}

function report(label: string, issues: Issue[]): void {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  console.log(`${errors.length ? '✗' : '✓'} ${label}: ${errors.length} errors, ${warnings.length} warnings`);
  for (const i of [...errors, ...warnings]) console.log(`  ${i.severity === 'error' ? 'error  ' : 'warning'} ${i.path}: ${i.message}`);
}

type Flags = Record<string, string | boolean>;

function parseArgs(argv: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[name] = next;
      i++;
    } else {
      flags[name] = true;
    }
  }
  return { positional, flags };
}

function str(v: string | boolean | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function required(v: string | undefined, what: string): string {
  if (!v) throw new UsageError(`Missing ${what}`);
  return v;
}

function humanize(id: string): string {
  return id
    .replace(/-\d+$/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e: unknown) => {
    if (e instanceof UsageError) {
      console.error(`${e.message}\n\nUsage: npm run lcw -- page import <file.svg> --theme <id> | page validate | page preview <id> | page export-svg <id> | index`);
    } else {
      console.error(e);
    }
    process.exit(1);
  },
);
