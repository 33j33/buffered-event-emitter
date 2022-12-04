import { EventData, Events, InitOptions, Listener, ListenerOptions } from "./types";
import {
  EventProp,
  EventController,
  getListenerIdx,
  checkListenerOptionsEquality,
  emitAfterTimeout,
  logger,
  attachControls,
} from "./utils";

// when buffered
const DEFAULT_BUFFER_CAPACITY = 5;

// when emission paused
const DEFAULT_EMISSION_INTERVAL = 0;

export class BufferedEventEmitter {
  protected _events: Events;
  protected _options: Required<InitOptions>;
  protected _status: "paused" | "emitting";
  protected _queueEmissions: boolean;
  protected _emissionInterval: number;
  protected _queue: { eventName: string; data?: EventData }[]; // stores queued events

  public static debugStatus = { emit: false, on: false, off: false };

  constructor(options?: InitOptions) {
    this._events = {};
    this._options = {
      buffered: options?.buffered ?? false,
      bufferCapacity: options?.bufferCapacity ?? DEFAULT_BUFFER_CAPACITY,
      logger: options?.logger ?? logger,
    };
    this._status = "emitting";
    this._queueEmissions = true;
    this._emissionInterval = DEFAULT_EMISSION_INTERVAL;
    this._queue = [];
  }

  /**
   *
   * Synchronously invokes each of the listeners registered for the event named eventName in the order they were registered.
   * Returns true if any listener was invoked, false otherwise.
   * @param eventName - event name
   * @returns event emitted status
   */
  public emit(eventName: string): boolean;
  /**
   * Synchronously invokes each of the listeners registered for the event named eventName with eventData as argument, in the order they were registered.
   * Returns true if any listener was invoked, false otherwise.
   * @param eventName - event name
   * @param data - argument to be passed to be listener when invoking it
   * @returns event emitted status
   */
  public emit(eventName: string, data: EventData): boolean;
  emit(eventName: string, data?: EventData): boolean {
    if (!this._events[eventName] || this._events[eventName].length === 0) {
      return false;
    }

    if (this._status === "paused") {
      if (this._queueEmissions) this._queue.push({ eventName, data });
      return false;
    }

    // collect events here which are !(once && emitted)
    let eventProps: EventProp[] = [];

    let didAnyEmit = false;

    // iterate through all registered events
    this._events[eventName].forEach((event: EventProp) => {
      let didEmit = false;

      // buffered event handling
      if (event?.options?.buffered) {
        event?.bucket?.push(data);
        const bufferCapacity = event?.options.bufferCapacity ?? this._options.bufferCapacity;

        if (event?.bucket && event.bucket.length >= bufferCapacity) {
          event.fn(event.bucket);
          didEmit = true;
          didAnyEmit = true;
          this._options.logger("emit", eventName, event.bucket);
          event.bucket = [];
        }
      } else {
        // non-buffered event handling
        event.fn(data);
        didEmit = true;
        didAnyEmit = true;
        this._options.logger("emit", eventName, data);
      }

      // filter out once emitted events
      if (!(event.once && didEmit)) {
        eventProps.push(event);
      }
    });
    this._events[eventName] = eventProps;
    return didAnyEmit;
  }

  /**
   * Adds an event listener for given event name and options.
   * If the combination of event name, listener and options is already present for the given event name the listener is not added a second time.
   * @param eventName - Name of the event, listener will be added to
   * @param listener - Function that will be called each time event is emitted
   * @param options - Config options for listener
   * @returns listener status if it was added or not
   */
  on(eventName: string, listener: Listener, options?: ListenerOptions): boolean {
    if (!this._events[eventName]) {
      this._events[eventName] = [];
    }
    // dedupe listeners
    let index = getListenerIdx(this._events[eventName], listener, options);
    if (index !== -1) return false;
    const eventProp = new EventProp(eventName, listener, false, options);
    if (options?.control instanceof EventController) {
      attachControls.call(this, options.control, eventProp);
    }
    this._events[eventName].push(eventProp);
    this._options.logger("on", eventName, listener);
    return true;
  }

  /**
   * Adds a one-time event listener for given event name and options.
   * If the combination of event name, listener and options is already present for the given event name the listener is not added a second time.
   * The first time event is triggered, this listener is invoked and then removed.
   * @param eventName - Name of the event, listener will be added to
   * @param listener - Function that will be called each time event is emitted
   * @param options - Config options for listener
   * @returns `true` if listener was added `false` otherwise.
   */
  once(eventName: string, listener: Listener, options?: ListenerOptions): boolean {
    if (!this._events[eventName]) {
      this._events[eventName] = [];
    }
    // dedupe listeners
    let index = getListenerIdx(this._events[eventName], listener, options);
    if (index !== -1) return false;
    const eventProp = new EventProp(eventName, listener, true, options);
    if (options?.control instanceof EventController) {
      attachControls.call(this, options.control, eventProp);
    }
    this._events[eventName].push(eventProp);
    this._options.logger("on", eventName, listener);
    return true;
  }

  /**
   * Removes an event listener previously registered with on() or addListener().
   * The event listener to be removed is identified using a combination of the event name, the event listener function itself, and provided options
   * @param eventName - Name of the event, listener was added to
   * @param listener - Listener function to be removed from the registered listeners array
   * @param options - Config options for listener
   * @returns `true` if listener was removed `false` otherwise.
   */
  off(eventName: string, listener: Listener, options?: ListenerOptions): boolean {
    let index = getListenerIdx(this._events[eventName], listener, options);
    if (index === -1) return false;
    this._events[eventName].splice(index, 1);
    this._options.logger("off", eventName, listener);
    return true;
  }

  /**
   * Flush all buffered events for all listeners for given event name.
   * @param eventName
   * @returns true if any events were emitted, else false
   */
  public flush(eventName: string): boolean;
  /**
   * Flush all buffered events for listener identified by combination of given event name, listener and options.
   * @param eventName
   * @param listener
   * @param options
   * @returns true if any events were emitted, else false
   */
  public flush(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
  flush(eventName: string, listener?: Listener, options?: ListenerOptions) {
    let didAnyEmit = false;
    let emittedOnceListenerIndexes: number[] = [];
    this._events[eventName].forEach((event, idx) => {
      if (event?.options?.buffered && event?.bucket && event.bucket.length > 0) {
        const matchesListenerFn = listener && listener === event.fn;
        const matchesOptions = options && checkListenerOptionsEquality(options, event.options);

        const shouldFlush =
          (eventName && matchesListenerFn && matchesOptions) ||
          (eventName && !listener && !options);

        if (shouldFlush) {
          event.fn(event.bucket);
          didAnyEmit = true;
          this._options.logger("emit", eventName, event.bucket);
          event.bucket = [];
          if (event.once) emittedOnceListenerIndexes.push(idx);
        }
      }
    });
    this._events[eventName] = this._events[eventName].filter(
      (_, idx) => !emittedOnceListenerIndexes.includes(idx)
    );
    return didAnyEmit;
  }

  /**
   * Pause event emissions. Any subsequent event emissions will be swallowed or queued and
   * their respective listeners will not be invoked until resume() is called.
   * @param queueEmissions if true, subsequent event emissions will be queued else swallowed
   * @param emissionInterval interval in ms for dequeueing queued events. if interval is 0, the events are dequeued synchronously else asynchronously but in order
   */
  pause(
    queueEmissions: boolean = true,
    emissionInterval: number = DEFAULT_EMISSION_INTERVAL
  ): void {
    this._queueEmissions = queueEmissions;
    this._emissionInterval = emissionInterval;
    this._status = "paused";
  }

  /**
   * Resumes event emission
   * @returns void or Promise depending on emission interval value.
   */
  resume(): Promise<void> | void {
    this._status = "emitting";
    if (this._queueEmissions) {
      if (this._emissionInterval > DEFAULT_EMISSION_INTERVAL) {
        const dequeueAsync = async () => {
          for (const item of this._queue) {
            await emitAfterTimeout.call(this, item, this._emissionInterval);
          }
        };
        return dequeueAsync();
      } else {
        this._queue.forEach(({ eventName, data }) => {
          this.emit(eventName, data);
        });
        this._queue = [];
      }
    }
  }

  /**
   * Remove all listeners for the provided event name.
   * @param eventName - event name
   * @returns `true` if any listener was removed for the event `false` otherwise.
   */
  offAll(eventName: string): Boolean {
    if (eventName && this._events[eventName]?.length > 0) {
      delete this._events[eventName];
      this._queue = this._queue.filter((e) => e.eventName !== eventName);
      return true;
    } else return false;
  }

  /**
   * Removes all listeners and queued events for the instance.
   */
  cleanup(): void {
    this._queue = [];
    this._events = {};
  }

  public listeners(): Events;
  public listeners(eventName: string): Listener[];
  listeners(eventName?: string) {
    if (eventName === undefined) {
      return this._events;
    } else {
      return this._events[eventName].map((event) => event.fn);
    }
  }

  /**
   * Enable debugging for all instances of the emitter
   * @param opts
   */
  static enableDebug(opts: { emit?: boolean; on?: boolean; off?: boolean }) {
    BufferedEventEmitter.debugStatus = {
      ...BufferedEventEmitter.debugStatus,
      ...opts,
    };
  }
}

// Aliases
export interface BufferedEventEmitter {
  /**
   * Alias for on(eventName, listener, options?). Adds an event listener for given event name and options.
   * If the combination of listener and options is already present the given event name the listener is not added a second time.
   * @param eventName - Name of the event, listener was added to
   * @param listener - Function that will be called each time event is emitted
   * @param options - Config options for listener
   * @returns listener status if it was added or not
   */
  addListener: typeof BufferedEventEmitter.prototype.on;

  /**
   * Alias for off(eventName, listener, options?). Removes an event listener previously registered with on() or addListener().
   * The event listener to be removed is identified using a combination of the event name, the event listener function itself, and provided options
   * @param eventName  Name of the event, listener will be added to
   * @param listener - Listener function to be removed from the registered listeners array
   * @param options - Config options for listener
   * @returns listener status if it was removed or not
   */
  removeListener: typeof BufferedEventEmitter.prototype.off;
}
BufferedEventEmitter.prototype.addListener = BufferedEventEmitter.prototype.on;
BufferedEventEmitter.prototype.removeListener = BufferedEventEmitter.prototype.off;
