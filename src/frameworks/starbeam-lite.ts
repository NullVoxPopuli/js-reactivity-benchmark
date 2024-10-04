/**
 * WARNING: this file uses a bunch of low level APIs to make the benchmark work,
 *          and are not something we want normal users to be exposed to.
 *
 *          Additionally, effects are not something we want to support,
 *          and this file has the only implementation of them.
 *
 *          Userland code does not need effects, but this benchmark requires
 *          that testing reactivity be entangled with effects.
 *          (which... is a tough spot to be in, because there needs to be *some*
 *            way to universally refer to "the thing which causes a user-observable
 *            update to happen)
 *
 *
 */
import { ReactiveFramework } from "../util/reactiveFramework";
// SAFETY: this js-reactivity-benchmark is not setup to type-ily consume type=module packages
//         js-reactivity-benchmark is cjs
// @ts-ignore
import { Cell, CachedFormula } from "@starbeam-lite/core";
// SAFETY: this js-reactivity-benchmark is not setup to type-ily consume type=module packages
//         js-reactivity-benchmark is cjs
// @ts-ignore
import { subscribe, notify, MutableTag } from "@starbeam-lite/core/subtle";
// SAFETY: this js-reactivity-benchmark is not setup to type-ily consume type=module packages
//         js-reactivity-benchmark is cjs
// @ts-ignore
import { consume, start, now } from "@starbeam-lite/shared";

start()();

const root = MutableTag.create();

class Scheduler {
  #queue: Set<() => void> = new Set();

  /**
   * Batched during .flush(), which happens automatically after a time
   * 
   * @param fn 
   */
  readonly schedule = (fn: () => void): void => {
    this.#queue.add(fn);
  };

  readonly flush = (): void => {
    for (const fn of this.#queue) {
      fn();
    }
    this.#queue.clear();
  };

  #time: number | undefined;
  readonly start = () => {
    this.#time = now();

    let activity: NodeJS.Timeout | undefined;
    let self = setTimeout(() => {
      if (this.#queue.size && this.#time !== now()) {
        this.flush();
        return;
      }

      clearTimeout(activity);
      activity = setTimeout(() => clearTimeout(self), 40);
    }, 1);
  };
}
const scheduler = new Scheduler();

scheduler.start();

export const starbeamLite: ReactiveFramework = {
  name: "Starbeam Lite",
  signal: (initialValue) => {
    const s = Cell.create(initialValue);
    return {
      write: (v) => {
        s.set(v);
        notify();
      },
      read: () => s.read(),
    };
  },
  computed: (fn) => {
    const c = CachedFormula.create(fn);
    return {
      read: () => c.read(),
    };
  },
  effect: (fn) => subscribe(root, fn),
  withBatch: (fn) => subscribe(root, fn),
  withBuild: (fn) => fn(),
};
