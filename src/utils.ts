import { BufferedEventEmitter } from "./bufferedEventEmitter";
import { ALL_EVENTS, EMIT_STATUS } from "./constants";
import { EventData, Listener, ListenerOptions } from "./types";

/**
 * Event Properties
 */
export class EventProp {
  public name: string;
  public fn: Listener;
  public once: boolean;
  public options: ListenerOptions | undefined;
  public bucket?: EventData[];
  public timeoutID?: ReturnType<typeof setTimeout>;

  constructor(name: string, fn: Listener, once: boolean, options: ListenerOptions | undefined) {
    this.name = name;
    this.fn = fn;
    this.once = once;
    this.options = options;
    if (options?.buffered) {
      this.bucket = [];
      this.timeoutID = undefined;
    }
  }
}

type PauseEventName = string | typeof ALL_EVENTS;
type EmitStatus = typeof EMIT_STATUS[keyof typeof EMIT_STATUS];
// Paused Event Properties
export class PausedEvtsProp {
  public name: PauseEventName; // eventname
  public shouldQ: boolean; // should Queue events
  public interval: number; // emission interval
  public status: EmitStatus;
  constructor(name: PauseEventName, status: EmitStatus, shouldQ: boolean, interval: number) {
    this.name = name;
    this.status = status;
    this.shouldQ = shouldQ;
    this.interval = interval;
  }
  updateProps({
    status,
    shouldQ,
    interval,
  }: {
    status?: EmitStatus;
    shouldQ?: boolean;
    interval?: number;
  }) {
    if (status) this.status = status;
    if (shouldQ !== undefined) this.shouldQ = shouldQ;
    if (interval !== undefined) this.interval = interval;
  }
  getProps() {
    return {
      status: this.status,
      shouldQ: this.shouldQ,
      interval: this.interval,
      name: this.name,
    };
  }
}

export function checkListenerOptionsEquality(
  obj1: ListenerOptions | undefined,
  obj2: ListenerOptions | undefined
) {
  if (obj1 === obj2) return true;
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
  options: ListenerOptions | undefined
): number {
  for (let i = 0; i < events.length; i++) {
    if (events[i].fn === listener && checkListenerOptionsEquality(events[i].options, options)) {
      return i;
    }
  }
  return -1;
}

export function emitAfterTimeout(
  this: BufferedEventEmitter,
  payload: { name: string; data?: EventData },
  ms: number
) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return new Promise(
    (resolve) =>
      (timeoutId = setTimeout(() => {
        this.emit(payload.name, payload.data);
        resolve(true);
      }, ms))
  ).finally(() => {
    clearTimeout(timeoutId);
  });
}

export function logger(
  type: "emit" | "on" | "off",
  eventName: string,
  eventData?: EventData | Listener
) {
  if (
    (type === "emit" && !BufferedEventEmitter.debugStatus.emit) ||
    (type === "on" && !BufferedEventEmitter.debugStatus.on) ||
    (type === "off" && !BufferedEventEmitter.debugStatus.off)
  )
    return;

  if (type === "emit") {
    try {
      eventData = JSON.stringify(eventData);
    } catch {
      eventData = `Object with the following keys failed to stringify: ${Object.keys(
        eventData
      ).join(",")}`;
    }
  } else if (["on", "off"].includes(type) && typeof eventData === "function") {
    eventData = eventData.toString();
  }

  const currentTime = new Date();
  const logTime = `${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}.${currentTime.getMilliseconds()}`;

  console.groupCollapsed(
    `%c[Event Type: ${type} | Event Name: ${eventName} | ${logTime}]`,
    "color: blue; font-size: 12px"
  );
  console.log(`%c[Event Data: ${eventData}}]`, "color: #AD5D4E; font-size: 11px");
  console.groupEnd();
}

export class EventController {
  flush() {}
  off() {}
}

const controls: Map<EventController, EventProp[]> = new Map();

export function attachControls(
  this: BufferedEventEmitter,
  control: EventController,
  eventProp: EventProp
) {
  const eventProps = controls.get(control) || [];
  eventProps.push(eventProp);
  controls.set(control, eventProps);
  control.off = () => {
    eventProps.forEach((p) => {
      this.off(p.name, p.fn, p.options);
    });
  };
  control.flush = () => {
    eventProps.forEach((p) => {
      this.flush(p.name, p.fn, p.options);
    });
  };
}

export function addToCache(
  this: BufferedEventEmitter,
  eventName: string,
  data: EventData | EventData[]
) {
  if (!this._opts.cache) return;
  const arr = this._cache.get(eventName);
  const newArr = arr || [];
  if (newArr.length >= this._opts.cacheCapacity) {
    newArr.shift();
  }
  newArr.push(data);
  this._cache.set(eventName, newArr);
}
