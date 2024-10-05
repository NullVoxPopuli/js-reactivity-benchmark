/**
 * @glimmer/validator is a low-level reactive library 
 * for building more ergonomic reactivity on top of.
 * 
 * It operates under the assumption that updates will be scheduled (as in the DOM)
 * 
 * None of this should be used in production applications.
 */
import { ReactiveFramework } from "../util/reactiveFramework";
import setGlobalContext from '@glimmer/global-context';
import {
  createTag,
  dirtyTag,
  consumeTag,
  createCache,
  getValue,
} from '@glimmer/validator';

let queue: any[] = [];

/**
 * Effects need an ownership model to unsubscribe / clean up...
 */
function flush() {
  for (const cache of queue) getValue(cache);
  queue.length = 0;
}
let revalidateScheduled = false;

setGlobalContext({
  scheduleRevalidate() {
    if (!revalidateScheduled) {
      Promise.resolve()
        .then(() => {
            revalidateScheduled = false;
            flush();

        })
        .catch((e) => console.error(e));
    }
  },

  getProp(obj: unknown, prop: string) {
    return (obj as Record<string, unknown>)[prop];
  },

  setProp(obj: unknown, prop: string, value: unknown) {
    (obj as Record<string, unknown>)[prop] = value;
  },

  getPath() { throw  new Error('Not needed'); },
  setPath() { throw  new Error('Not needed'); },
  toBool() { throw  new Error('Not needed'); },
  toIterator() { throw  new Error('Not needed'); },
  warnIfStyleNotTrusted() { throw  new Error('Not needed'); },
  scheduleDestroy() { throw  new Error('Not needed'); },
  scheduleDestroyed() { throw  new Error('Not needed'); },
  assert() { throw  new Error('Not needed'); },
  deprecate() { throw  new Error('Not needed'); },
});


function effect(fn: () => unknown) {
    queue.push(createCache(fn));
}


export const glimmer: ReactiveFramework = {
  name: "Glimmer",
  signal: (initialValue) => {
    let value = initialValue;
    let tag = createTag();

    return {
      write: (v) => {
        dirtyTag(tag);
        value = v;
      },
      read: () => {
        consumeTag(tag);
        return value;
      },
    };
  },
  computed: <T>(fn: () => T) => {
    const cache = createCache(fn);
    return {
      read: () => getValue(cache) as T,
    };
  },
  effect: (fn) => effect(fn),
  withBatch: (fn) => effect(fn),
  withBuild: (fn) => fn(),
};
