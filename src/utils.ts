import { Listener, ListenerOptions } from "./types";

export class EventProp {
  public fn: Listener;
  public once: boolean;
  public options: ListenerOptions;
  public bucket?: any[];
  public timeoutID?: ReturnType<typeof setTimeout>;

  constructor(fn: Listener, once: boolean, options: ListenerOptions) {
    this.fn = fn;
    this.once = once;
    this.options = options;
    if (options?.buffered) {
      this.bucket = [];
      this.timeoutID = undefined;
    }
  }
}

export function checkListenerOptionsEquality(
  obj1: ListenerOptions,
  obj2: ListenerOptions
) {
  if (!obj1 || !obj2) return false;
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) {
    return false;
  }

  let key: keyof ListenerOptions;
  for (key in obj1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}

export function getListenerIdx(
  events: EventProp[],
  listener: Listener,
  options: ListenerOptions
): number {
  for (let i = 0; i < events.length; i++) {
    if (
      events[i].fn === listener &&
      checkListenerOptionsEquality(events[i].options, options)
    ) {
      return i;
    }
  }
  return -1;
}
