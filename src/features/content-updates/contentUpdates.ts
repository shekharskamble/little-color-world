import Constants from 'expo-constants';

import { existingContent, installedPacks, setInstalledPacks } from '../../content/registry';
import type { SqlDatabase } from '../../persistence/sql';
import { contentSource, LIMITS, type ContentSource } from './config';
import { fileSystemPackStore } from './packStore';
import { checkForUpdates, loadInstalledPacks, type FetchBytes, type LoadedPack } from './updater';
import { ContentError } from './verify';

/**
 * The only place the app goes online (CLAUDE.md, decision D7 revised 2026-11-13): one check per launch while the app
 * is open, never in the background. It sends no identifiers, only plain GETs for public files.
 */
let started = false;

/** Before the catalog shows: puts the packs already on this device into the registry. */
export async function loadInstalledContent(db: SqlDatabase): Promise<void> {
  setInstalledPacks([]);
  setInstalledPacks(await loadInstalledPacks(db, fileSystemPackStore, existingContent()));
}

/** Starts this launch's update check (once per launch). New packs join the catalog as each one finishes. */
export function startContentUpdateCheck(db: SqlDatabase, onInstalled?: (pack: LoadedPack) => void): void {
  if (started) return;
  started = true;
  const source = contentSource(__DEV__);
  // Release builds stay offline until the owner's signing key is set (config.ts).
  if (!source.publicKeyHex) return;
  checkForUpdates(
    {
      db,
      store: fileSystemPackStore,
      fetchBytes: limitedFetch(source),
      source,
      publicKeyHex: source.publicKeyHex,
      appVersion: Constants.expoConfig?.version ?? '0.0.0',
      existing: existingContent,
    },
    (pack) => {
      setInstalledPacks([...installedPacks().filter((p) => p.id !== pack.id), pack]);
      onInstalled?.(pack);
    },
  )
    .then((r) => {
      if (__DEV__) console.log(`Content check: ${r.installed.length} installed`, r.failed);
    })
    .catch((e: unknown) => {
      // Offline, server down or a bad manifest: nothing changes, and the next launch tries again.
      if (__DEV__) console.log('Content check failed', e instanceof Error ? e.message : e);
    });
}

/** GET with a timeout and a hard size cap, refusing redirects off the content host. */
function limitedFetch(source: ContentSource): FetchBytes {
  return async (url, maxBytes) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LIMITS.timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json, text/plain' } });
      if (res.url && !source.allowedOrigins.includes(new URL(res.url).origin)) throw new ContentError('Redirected off the content host');
      if (!res.ok) throw new ContentError(`HTTP ${res.status} for ${url}`);
      const declared = Number(res.headers.get('content-length') ?? '0');
      if (declared > maxBytes) throw new ContentError(`${url} is too big`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length > maxBytes) throw new ContentError(`${url} is too big`);
      return bytes;
    } finally {
      clearTimeout(timer);
    }
  };
}
