import { z } from 'zod';

import { Theme } from './page';

/**
 * Remote content packs (docs/CONTENT_DELIVERY.md). The manifest lists every published pack; each pack's `pack.json`
 * lists its page files. Every file is pinned by size and SHA-256, and the manifest itself is signed (Ed25519), so a
 * file the app accepts is exactly the one the owner published.
 */

const Sha256 = z.string().regex(/^[0-9a-f]{64}$/, 'sha256 must be 64 lowercase hex characters');
/** A path below the content root: lowercase segments only, no "..", no leading slash, no query. */
const ContentPath = z.string().regex(/^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9.-]*)*$/, 'Unsafe content path');
const SemVer = z.string().regex(/^\d+\.\d+\.\d+$/);
export const PackId = z.string().regex(/^[a-z][a-z0-9-]{1,47}$/);

export const ManifestPack = z.object({
  id: PackId,
  version: z.number().int().positive(),
  /** Apps older than this skip the pack (e.g. it needs a fill type they cannot draw). */
  minAppVersion: SemVer,
  path: ContentPath,
  sha256: Sha256,
  bytes: z.number().int().positive(),
});

export const Manifest = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  packs: z.array(ManifestPack).max(500),
});

export const PackFile = z.object({
  /** Page id; the file must hold the page with this id. */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
  path: ContentPath,
  sha256: Sha256,
  bytes: z.number().int().positive(),
});

export const PackIndex = z.object({
  schemaVersion: z.literal(1),
  id: PackId,
  version: z.number().int().positive(),
  /** A brand-new theme this pack brings; absent when the pack only adds pages to existing themes. */
  theme: Theme.optional(),
  pages: z.array(PackFile).min(1).max(200),
});

export type ManifestPack = z.infer<typeof ManifestPack>;
export type Manifest = z.infer<typeof Manifest>;
export type PackFile = z.infer<typeof PackFile>;
export type PackIndex = z.infer<typeof PackIndex>;
