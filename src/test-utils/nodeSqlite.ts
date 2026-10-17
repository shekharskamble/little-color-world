// Test-only SqlDatabase backed by Node's built-in SQLite (node:sqlite, Node ≥ 22.5).
// Gives repository tests real SQL semantics without the native expo-sqlite module.
import { DatabaseSync } from 'node:sqlite';

import type { SqlDatabase, SqlValue } from '../persistence/sql';

export function openTestDatabase(path = ':memory:'): SqlDatabase & { close(): void } {
  const db = new DatabaseSync(path);
  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, ...params: SqlValue[]) {
      return db.prepare(source).run(...params);
    },
    async getFirstAsync<T>(source: string, ...params: SqlValue[]) {
      return (db.prepare(source).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(source: string, ...params: SqlValue[]) {
      return db.prepare(source).all(...params) as T[];
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    close: () => db.close(),
  };
}
