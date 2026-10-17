export type Autosaver<T> = {
  /** Remember the latest value and save it after `delayMs` of inactivity. */
  schedule(value: T): void;
  /** Save any pending value now. Resolves once all saves so far have finished. */
  flush(): Promise<void>;
  hasPending(): boolean;
};

/**
 * Debounced, serialized saver: at most one write in flight, writes happen in
 * order, and only the latest pending value is written.
 */
export function createAutosaver<T>(
  save: (value: T) => Promise<void>,
  delayMs: number,
  onError: (error: unknown) => void = () => {},
): Autosaver<T> {
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();

  const flush = (): Promise<void> => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending) {
      const { value } = pending;
      pending = null;
      chain = chain.then(() => save(value)).catch(onError);
    }
    return chain;
  };

  return {
    schedule(value) {
      pending = { value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void flush(), delayMs);
    },
    flush,
    hasPending: () => pending !== null,
  };
}
