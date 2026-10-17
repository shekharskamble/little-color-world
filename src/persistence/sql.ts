export type SqlValue = string | number | null;

/**
 * The subset of expo-sqlite's SQLiteDatabase our repositories use. Keeping
 * repositories on this interface lets tests run them against node:sqlite.
 */
export interface SqlDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: SqlValue[]): Promise<unknown>;
  getFirstAsync<T>(source: string, ...params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: SqlValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
