import { Directory, File, Paths } from 'expo-file-system';

/** Where downloaded packs live. An interface so the updater can be tested without a device. */
export interface PackStore {
  /** Writes every file into a staging folder, then renames it into place; returns the pack's path. */
  install(packId: string, version: number, files: readonly { name: string; bytes: Uint8Array }[]): Promise<string>;
  read(path: string, name: string): Promise<Uint8Array>;
  remove(path: string): void;
  /** Deletes staging folders left by a crash and pack folders no installed pack refers to. */
  collectGarbage(keepPaths: ReadonlySet<string>): void;
}

const ROOT = 'content/packs';

/**
 * documentDirectory/content/packs/<packId>/<version>/ holds pack.json and pages/<pageId>.json. A pack is written to a
 * sibling `.staging-<version>` folder first and renamed when complete, so a crash never leaves a half-written pack in
 * place; the database row is written only after the rename.
 */
export const fileSystemPackStore: PackStore = {
  async install(packId, version, files) {
    const parent = new Directory(Paths.document, ROOT, packId);
    parent.create({ intermediates: true, idempotent: true });
    const staging = new Directory(parent, `.staging-${version}`);
    if (staging.exists) staging.delete();
    staging.create();
    for (const f of files) {
      const file = new File(staging, f.name);
      file.parentDirectory.create({ intermediates: true, idempotent: true });
      await file.write(f.bytes);
    }
    const target = new Directory(parent, String(version));
    if (target.exists) target.delete();
    staging.rename(String(version));
    return `${ROOT}/${packId}/${version}`;
  },
  async read(path, name) {
    return new File(Paths.document, path, name).bytes();
  },
  remove(path) {
    const dir = new Directory(Paths.document, path);
    if (dir.exists) dir.delete();
  },
  collectGarbage(keepPaths) {
    const root = new Directory(Paths.document, ROOT);
    if (!root.exists) return;
    for (const packDir of root.list()) {
      if (!(packDir instanceof Directory)) continue;
      for (const versionDir of packDir.list()) {
        if (!keepPaths.has(`${ROOT}/${packDir.name}/${versionDir.name}`)) versionDir.delete();
      }
      if (packDir.list().length === 0) packDir.delete();
    }
  },
};
