import { createAutosaver } from './autosave';

describe('createAutosaver', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('debounces bursts into one save of the latest value', async () => {
    const saved: number[] = [];
    const saver = createAutosaver(async (v: number) => void saved.push(v), 1500);
    saver.schedule(1);
    jest.advanceTimersByTime(1000);
    saver.schedule(2);
    jest.advanceTimersByTime(1000);
    saver.schedule(3);
    expect(saved).toEqual([]);
    jest.advanceTimersByTime(1500);
    await saver.flush();
    expect(saved).toEqual([3]);
  });

  it('flush saves immediately and cancels the timer', async () => {
    const save = jest.fn(async () => {});
    const saver = createAutosaver(save, 1500);
    saver.schedule('a');
    expect(saver.hasPending()).toBe(true);
    await saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(5000);
    expect(save).toHaveBeenCalledTimes(1);
    await saver.flush(); // nothing pending: no extra write
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('serializes writes and keeps going after a failed save', async () => {
    const order: string[] = [];
    const errors: unknown[] = [];
    const saver = createAutosaver(
      async (v: string) => {
        if (v === 'bad') throw new Error('disk full');
        order.push(v);
      },
      10,
      (e) => errors.push(e),
    );
    saver.schedule('bad');
    void saver.flush();
    saver.schedule('good');
    await saver.flush();
    expect(order).toEqual(['good']);
    expect(errors).toHaveLength(1);
  });
});
