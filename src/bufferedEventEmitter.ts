type Events = {
  [eventName: string]: EventProp[];
};

type ListenerOptions = {
  buffered?: boolean;
  bufferCapacity?: number;
};

type EventData = any;

type Listener = (data: EventData) => void;

class EventProp {
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

export class BufferedEventEmitter {
  protected _events: Events;
  protected _defaultListenerOptions: Required<ListenerOptions>;
  protected _status: "paused" | "emitting";
  protected _shouldQueueEmissions: boolean;
  protected _emissionInterval: number;
  protected _queue: { eventName: string; data?: EventData }[];
  protected static debugEnabled = { logEmit: false, logSubscribe: false };

  constructor(options?: ListenerOptions) {
    this._events = {};
    this._defaultListenerOptions = {
      buffered: options?.buffered ?? false,
      bufferCapacity: options?.bufferCapacity ?? 5,
    };
    this._status = "emitting";
    this._shouldQueueEmissions = true;
    this._emissionInterval = 0;
    this._queue = [];
  }

  /**
   *
   * Synchronously invokes each of the listeners registered for the event named eventName in the order they were registered.
   * Returns true if any listener was invoked, false otherwise.
   * @param eventName - event name
   *  @returns event emitted status
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
      if (this._shouldQueueEmissions) this._queue.push({ eventName, data });
      return false;
    }

    // collect events here which are !(once && emitted)
    let eventProps: EventProp[] = [];

    let didAnyEmit = false;

    // iterate through all registered events
    this._events[eventName].forEach((event: EventProp) => {
      let didEmit = false;

      // buffered event handling
      if (event.options.buffered) {
        event?.bucket?.push(data);
        const bufferCapacity =
          event.options.bufferCapacity ??
          this._defaultListenerOptions.bufferCapacity;

        if (event?.bucket && event.bucket.length >= bufferCapacity) {
          event.fn(event.bucket);
          didEmit = true;
          didAnyEmit = true;
          this.logger("emit", eventName, event.bucket);
          event.bucket = [];
        }
      } else {
        // non-buffered event handling
        event.fn(data);
        didEmit = true;
        didAnyEmit = true;
        this.logger("emit", eventName, data);
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
   * If the combination of listener and options is already for the given event name the listener is not added a second time.
   * @param eventName - Name of the event, listener will be added to
   * @param listener - Function that will be called each time event is emitted
   * @param options - Config options for listener
   * @returns listener status if it was added or not
   */
  on(
    eventName: string,
    listener: Listener,
    options: ListenerOptions = {}
  ): boolean {
    if (!this._events[eventName]) {
      this._events[eventName] = [];
    }
    let index = getListenerIdx(this._events[eventName], listener, options);
    if (index !== -1) return false;
    this._events[eventName].push(new EventProp(listener, false, options));
    this.logger("subscribe", eventName, listener);
    return true;
  }

  /**
   * Adds a one-time event listener for given event name and options.
   * If the combination of listener and options is already for the given event name the listener is not added a second time.
   * The next time event is triggered, this listener is invoked and then removed.
   * @param eventName - Name of the event, listener will be added to
   * @param listener - Function that will be called each time event is emitted
   * @param options - Config options for listener
   * @returns listener status if it was added or not
   */
  once(
    eventName: string,
    listener: Listener,
    options: ListenerOptions = {}
  ): boolean {
    if (!this._events[eventName]) {
      this._events[eventName] = [];
    }
    let index = getListenerIdx(this._events[eventName], listener, options);
    if (index !== -1) return false;
    this._events[eventName].push(new EventProp(listener, true, options));
    this.logger("subscribe", eventName, listener);
    return true;
  }

  /**
   * Removes an event listener previously registered with on() or addListener().
   * The event listener to be removed is identified using a combination of the event name, the event listener function itself, and provided options
   * @param eventName - Name of the event, listener was added to
   * @param listener - Listener function to be removed from the registered listeners array
   * @param options - Config options for listener
   * @returns listener status if it was removed or not
   */
  removeListener(
    eventName: string,
    listener: Listener,
    options: ListenerOptions = {}
  ): boolean {
    let index = getListenerIdx(this._events[eventName], listener, options);
    if (index === -1) return false;
    this._events[eventName].splice(index, 1);
    return true;
  }

  /**
   * Flush all buffered events for listeners for given event name.
   * @param eventName
   * @returns true if any events were emitted, else false
   */
  public flush(eventName: string): boolean;
  /**
   * Flush all buffered events for given combination of event name, listener and options.
   * @param eventName
   * @param listener
   * @param options
   * @returns true if any events were emitted, else false
   */
  public flush(
    eventName: string,
    listener: Listener,
    options: ListenerOptions
  ): boolean;
  flush(eventName: string, listener?: Listener, options?: ListenerOptions) {
    let didAnyEmit = false;
    let emittedOnceListenerIndexes: number[] = [];
    this._events[eventName].forEach((event, idx) => {
      if (event.options.buffered && event?.bucket && event.bucket.length > 0) {
        const matchesListenerFn = listener && listener === event.fn;
        const matchesOptions =
          options && checkListenerOptionsEquality(options, event.options);

        const shouldFlush =
          (eventName && matchesListenerFn && matchesOptions) ||
          (eventName && !listener && !options);

        if (shouldFlush) {
          event.fn(event.bucket);
          didAnyEmit = true;
          this.logger("emit", eventName, event.bucket);
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
   * Pause event emissions. Any subsequent event emissions will be stopped or queued and
   * their respective listeners will not be invoked until resume() is called.
   * @param queueEmissions if true, subsequent event emissions will be queued else stopped
   * @param emissionInterval interval for dequeueing queued events. if interval is 0, the events are dequeued in synchronously
   */
  pause(queueEmissions: boolean = true, emissionInterval: number = 0): void {
    this._shouldQueueEmissions = queueEmissions;
    this._emissionInterval = emissionInterval;
    this._status = "paused";
  }

  /**
   * Resumes event emission
   * @returns void or Promise depending on emission interval value.
   */
  resume(): Promise<void> | void {
    this._status = "emitting";
    if (this._shouldQueueEmissions) {
      if (this._emissionInterval > 0) {
        const dequeueAsync = async () => {
          console.log("queue", this._queue);
          for (const item of this._queue) {
            await this.#emitAfterTimeout(item, this._emissionInterval);
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

  public listeners(): Events;
  public listeners(eventName: string): Listener[];
  listeners(eventName?: string) {
    if (eventName === undefined) {
      return this._events;
    } else {
      return this._events[eventName].map((event) => event.fn);
    }
  }

  // aliases

  /**
   * Adds an event listener for given event name and options.
   * If the combination of listener and options is already for the given event name the listener is not added a second time.
   * @param eventName - Name of the event, listener was added to
   * @param listener - Function that will be called each time event is emitted
   * @param options - Config options for listener
   * @returns listener status if it was added or not
   */
  addListener(
    eventName: string,
    listener: Listener,
    options: ListenerOptions = {}
  ): boolean {
    return this.on(eventName, listener, options);
  }

  /**
   * Removes an event listener previously registered with on() or addListener().
   * The event listener to be removed is identified using a combination of the event name, the event listener function itself, and provided options
   * @param eventName - Name of the event, listener will be added to
   * @param listener - Listener function to be removed from the registered listeners array
   * @param options - Config options for listener
   * @returns listener status if it was removed or not
   */
  off(
    eventName: string,
    listener: Listener,
    options: ListenerOptions = {}
  ): boolean {
    return this.removeListener(eventName, listener, options);
  }

  logger(
    type: "emit" | "subscribe",
    eventName: string,
    eventData?: EventData | Listener
  ) {
    if (
      (type === "emit" && !BufferedEventEmitter.debugEnabled.logEmit) ||
      (type === "subscribe" && !BufferedEventEmitter.debugEnabled.logSubscribe)
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
    } else if (type === "subscribe" && typeof eventData === "function") {
      eventData = eventData.toString();
    }

    const currentTime = new Date();
    const logTime = `${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}.${currentTime.getMilliseconds()}`;

    console.groupCollapsed(
      `%c[Event Type: ${type} | Event Name: ${eventName} | ${logTime}]`,
      "color: blue; font-size: 12px"
    );
    console.log(
      `%c[Event Data: ${eventData}}]`,
      "color: #AD5D4E; font-size: 11px"
    );
    console.groupEnd();
  }

  #emitAfterTimeout(
    payload: { eventName: string; data?: EventData },
    ms: number
  ) {
    let timeoutId: ReturnType<typeof setTimeout>;
    return new Promise(
      (resolve) =>
        (timeoutId = setTimeout(() => {
          this.emit(payload.eventName, payload.data);
          resolve(true);
        }, ms))
    ).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  static enableDebug(logEmit?: boolean, logSubscribe?: boolean) {
    if (logEmit === undefined && logSubscribe === undefined) {
      this.debugEnabled = { logEmit: true, logSubscribe: true };
    }
    if (logEmit !== undefined)
      this.debugEnabled = { ...this.debugEnabled, logEmit };
    if (logSubscribe !== undefined) {
      this.debugEnabled = { ...this.debugEnabled, logSubscribe };
    }
  }
}

function checkListenerOptionsEquality(
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

function getListenerIdx(
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
