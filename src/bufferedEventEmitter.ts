import {
  DEFAULT_BUFFER_CAPACITY,
  ALL_EVENTS,
  DEFAULT_QUEUE_EMISSION,
  DEFAULT_EMISSION_INTERVAL,
  DEFAULT_IS_BUFFERED,
  DEFAULT_IS_CACHE,
  DEFAULT_CACHE_CAPACITY,
  EMIT_STATUS,
  DEFAULT_BUFFER_INACTIVITY_TIMEOUT,
} from "./constants";
import {
  DebugStatus,
  EventData,
  Events,
  IBufferedEventEmitter,
  InitOptions,
  Listener,
  ListenerOptions,
} from "./types";
import {
  EventProp,
  EventController,
  getListenerIdx,
  checkListenerOptionsEquality,
  emitAfterTimeout,
  logger,
  attachControls,
  PausedEvtsProp,
  debugStatus,
  updateDebugStatus,
} from "./utils";

export class BufferedEventEmitter implements IBufferedEventEmitter {
  protected _evts: Events;
  protected _opts: Required<InitOptions>;
  protected _pEvtsConf: Map<string, PausedEvtsProp>; // stores paused events config
  protected _pEvtsQ: { name: string; data: EventData }[]; // store paused events data
  protected _cache: Map<string, EventData[]>;

  constructor(options?: InitOptions) {
    this._evts = {};
    this._opts = {
      buffered: options?.buffered ?? DEFAULT_IS_BUFFERED,
      bufferCapacity: options?.bufferCapacity ?? DEFAULT_BUFFER_CAPACITY,
      bufferInactivityTimeout:
        options?.bufferInactivityTimeout ?? DEFAULT_BUFFER_INACTIVITY_TIMEOUT,
      logger: options?.logger ?? logger,
      cache: options?.cache ?? DEFAULT_IS_CACHE,
      cacheCapacity: options?.cacheCapacity ?? DEFAULT_CACHE_CAPACITY,
    };
    // Initialize pause/resume configuration with default "emitting" state for all events.
    // This ensures ALL_EVENTS always exists for global pause/resume operations and
    // eliminates null checks when determining if events should be paused or queued.
    this._pEvtsConf = new Map([
      [
        ALL_EVENTS,
        new PausedEvtsProp(
          ALL_EVENTS,
          EMIT_STATUS.EMITTING,
          DEFAULT_QUEUE_EMISSION,
          DEFAULT_EMISSION_INTERVAL
        ),
      ],
    ]);
    this._pEvtsQ = [];
    this._cache = new Map();
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
    if (!this._evts[eventName] || this._evts[eventName].length === 0) {
      return false;
    }

    const allEventsPaused = this._pEvtsConf.get(ALL_EVENTS)?.status === EMIT_STATUS.PAUSED;
    const thisEventPaused = this._pEvtsConf.get(eventName)?.status === EMIT_STATUS.PAUSED;
    if (allEventsPaused || thisEventPaused) {
      if (this._pEvtsConf.get(ALL_EVENTS)?.shouldQ || this._pEvtsConf.get(eventName)?.shouldQ)
        this._pEvtsQ.push({ name: eventName, data });
      return false;
    }

    let emittedOnceListeners: EventProp[] = [];

    // flag to store if any event emission invokes a listener
    let didInvokeAnyListener = false;

    // removing listeners shouldn't affect current emission process
    const listeners = [...this._evts[eventName]];

    // iterate through all registered events
    listeners.forEach((event: EventProp) => {
      let didInvokeCurrentListener = false;

      // buffered event handling
      if (event?.options?.buffered) {
        event?.bucket?.push(data);
        const bufferCapacity = event?.options.bufferCapacity ?? this._opts.bufferCapacity;

        if (event?.bucket && event.bucket.length >= bufferCapacity) {
          // new event emissions should clear the timeout
          if (event.bufferInactivityTimeoutId) {
            clearTimeout(event.bufferInactivityTimeoutId);
            event.bufferInactivityTimeoutId = undefined;
          }

          event.fn(event.bucket);
          addToCache.call(this, eventName, event.bucket);
          didInvokeCurrentListener = true;
          didInvokeAnyListener = true;
          this._opts.logger("emit", eventName, event.bucket);
          event.bucket = [];
        } else if (event?.bucket && event.bucket.length > 0) {
          // bucket less than bufferCapacity

          const timeoutDuration =
            event?.options?.bufferInactivityTimeout ?? this._opts.bufferInactivityTimeout;
          // create inactivity timeout when bufferInactivityTimeout is set in listener or default config to something greater than 0ms
          if (timeoutDuration > 0) {
            // Clear existing timeout before creating new one
            if (event.bufferInactivityTimeoutId) {
              clearTimeout(event.bufferInactivityTimeoutId);
              event.bufferInactivityTimeoutId = undefined;
            }
            event.bufferInactivityTimeoutId = setTimeout(() => {
              if (event?.bucket && event.bucket.length) {
                event.fn(event.bucket);
                addToCache.call(this, eventName, event.bucket);
                this._opts.logger("emit", eventName, event.bucket);
                event.bucket = [];
              }
              event.bufferInactivityTimeoutId = undefined;
            }, timeoutDuration);
          }
        }
      } else {
        // non-buffered event handling
        event.fn(data);
        addToCache.call(this, eventName, data);
        didInvokeCurrentListener = true;
        didInvokeAnyListener = true;
        this._opts.logger("emit", eventName, data);
      }

      // capture once emitted listeners
      if (event.once && didInvokeCurrentListener) {
        emittedOnceListeners.push(event);
      }
    });
    this._evts[eventName] =
      this._evts?.[eventName]?.filter((event) => !emittedOnceListeners.includes(event)) ?? [];
    return didInvokeAnyListener;
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
    if (!this._evts[eventName]) {
      this._evts[eventName] = [];
    }
    // dedupe listeners
    // TODO - do we need to support registering same listener with different options?
    let index = getListenerIdx(this._evts[eventName], listener, options);
    if (index !== -1) return false;
    const eventProp = new EventProp(eventName, listener, false, options);
    if (options?.control instanceof EventController) {
      attachControls.call(this, options.control, eventProp);
    }
    this._evts[eventName].push(eventProp);
    this._opts.logger("on", eventName, listener);
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
    if (!this._evts[eventName]) {
      this._evts[eventName] = [];
    }
    // dedupe listeners
    // TODO - do we need to support registering same listener with different options?
    let index = getListenerIdx(this._evts[eventName], listener, options);
    if (index !== -1) return false;
    const eventProp = new EventProp(eventName, listener, true, options);
    if (options?.control instanceof EventController) {
      attachControls.call(this, options.control, eventProp);
    }
    this._evts[eventName].push(eventProp);
    this._opts.logger("on", eventName, listener);
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
    if (!this._evts[eventName] || this._evts[eventName].length === 0) return false;

    // TODO - do we need to disallow removing a listener if the options are not provided?
    let index = getListenerIdx(this._evts[eventName], listener, options);
    if (index === -1) return false;
    const [event] = this._evts[eventName].splice(index, 1);
    if (event.bufferInactivityTimeoutId) {
      clearTimeout(event.bufferInactivityTimeoutId);
      event.bufferInactivityTimeoutId = undefined;
    }
    this._opts.logger("off", eventName, listener);
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
    if (!this._evts[eventName] || this._evts[eventName].length === 0) return false;
    let didAnyFlush = false;
    let emittedOnceListeners: EventProp[] = [];
    // removing listeners shouldn't affect current emission process
    const listeners = [...this._evts[eventName]];

    listeners.forEach((event) => {
      if (event?.options?.buffered && event?.bucket && event.bucket.length > 0) {
        const matchesListenerFn = listener && listener === event.fn;
        const matchesOptions = options && checkListenerOptionsEquality(options, event.options);

        const shouldFlush =
          (matchesListenerFn && matchesOptions) ||
          (matchesListenerFn && !options) ||
          (!listener && !options);

        if (shouldFlush) {
          // clear timeout if defined
          if (event.bufferInactivityTimeoutId) {
            clearTimeout(event.bufferInactivityTimeoutId);
            event.bufferInactivityTimeoutId = undefined;
          }
          event.fn(event.bucket);
          addToCache.call(this, eventName, event.bucket);
          didAnyFlush = true;

          this._opts.logger("emit", eventName, event.bucket);
          event.bucket = [];
          if (event.once) emittedOnceListeners.push(event);
        }
      }
    });

    this._evts[eventName] =
      this._evts?.[eventName]?.filter((event) => !emittedOnceListeners.includes(event)) ?? [];

    return didAnyFlush;
  }

  /**
   * Pause event emissions for all or provided event. Any subsequent event emissions will be swallowed or queued and
   * their respective listeners will not be invoked until resume() is called.
   * @param opts configure pausing using options
   * @param opts.name name for event to be paused
   * @param opts.queueEmissions if true, subsequent event emissions will be queued else swallowed
   * @param opts.emissionInterval interval in ms for dequeueing queued events. if interval is 0, the events are dequeued synchronously else asynchronously but in order
   */
  pause(opts?: { eventName?: string; queueEmissions?: boolean; emissionInterval?: number }): void {
    const queueEmissions = opts?.queueEmissions ?? DEFAULT_QUEUE_EMISSION;
    const emissionInterval = opts?.emissionInterval ?? DEFAULT_EMISSION_INTERVAL;
    if (typeof opts?.eventName === "string") {
      this._pEvtsConf.set(
        opts?.eventName,
        new PausedEvtsProp(opts?.eventName, EMIT_STATUS.PAUSED, queueEmissions, emissionInterval)
      );
    } else {
      // delete all other paused events
      if (this._pEvtsConf.size > 1) this._pEvtsConf.clear();
      this._pEvtsConf.set(
        ALL_EVENTS,
        new PausedEvtsProp(ALL_EVENTS, EMIT_STATUS.PAUSED, queueEmissions, emissionInterval)
      );
    }
  }

  /**
   * Resumes event emission for all or provided event
   * @param eventName: name for event to be resumed.
   * @returns void or Promise depending on emission interval value.
   */
  resume(eventName?: string): Promise<void> | void {
    let pausedEvents: typeof this._pEvtsQ = [];
    let emissionInterval: number = DEFAULT_EMISSION_INTERVAL;
    if (typeof eventName === "string") {
      if (this._pEvtsConf.get(eventName)) {
        const { shouldQ, status, interval } = (
          this._pEvtsConf.get(eventName) as PausedEvtsProp
        ).getProps();
        this._pEvtsConf.delete(eventName);
        if (status === EMIT_STATUS.PAUSED) {
          if (shouldQ) {
            this._pEvtsQ = this._pEvtsQ.filter((o) => {
              if (o.name === eventName) {
                pausedEvents.push(o);
                return false;
              } else return true;
            });
            emissionInterval = interval;
          }
        }
      }
    } else {
      if (this._pEvtsConf.size > 1) {
        // use default values when eventName is not provided
        emissionInterval = DEFAULT_EMISSION_INTERVAL;
        pausedEvents = this._pEvtsQ;
        this._pEvtsQ = [];
      } else if (this._pEvtsConf.get(ALL_EVENTS)) {
        const { shouldQ, status, interval } = (
          this._pEvtsConf.get(ALL_EVENTS) as PausedEvtsProp
        ).getProps();
        this._pEvtsConf.clear();
        if (status === EMIT_STATUS.PAUSED) {
          if (shouldQ) {
            pausedEvents = this._pEvtsQ;
            this._pEvtsQ = [];
            emissionInterval = interval;
          }
        }
      }
    }
    // async
    if (emissionInterval > DEFAULT_EMISSION_INTERVAL) {
      const dequeueAsync = async () => {
        for (const item of pausedEvents) {
          await emitAfterTimeout.call(this, item, emissionInterval);
        }
      };
      return dequeueAsync();
      // sync
    } else {
      pausedEvents.forEach(({ name, data }) => {
        this.emit(name, data);
      });
    }
  }

  /**
   * Remove all listeners for the provided event name.
   * @param eventName - event name
   * @returns `true` if any listener was removed for the event `false` otherwise.
   */
  offAll(eventName: string): Boolean {
    if (eventName && this._evts[eventName]?.length > 0) {
      const events = this._evts[eventName];
      events.forEach((event) => {
        if (event.bufferInactivityTimeoutId) {
          clearTimeout(event.bufferInactivityTimeoutId);
          event.bufferInactivityTimeoutId = undefined;
        }
      });
      delete this._evts[eventName];
      this._pEvtsQ = this._pEvtsQ.filter((e) => e.name !== eventName);
      this._pEvtsConf.delete(eventName);
      this._cache.delete(eventName);
      return true;
    } else return false;
  }

  /**
   * Removes all listeners and queued events for the instance.
   */
  cleanup(): void {
    this._pEvtsConf.clear();
    this._pEvtsQ = [];
    this._cache.clear();
    Object.values(this._evts).forEach((events) => {
      events.forEach((event) => {
        if (event.bufferInactivityTimeoutId) {
          clearTimeout(event.bufferInactivityTimeoutId);
          event.bufferInactivityTimeoutId = undefined;
        }
      });
    });
    this._evts = {};
  }

  public listeners(): Events;
  public listeners(eventName: string): Listener[];
  listeners(eventName?: string) {
    if (eventName === undefined) {
      return this._evts;
    } else {
      if (!this._evts[eventName]) return [];
      return this._evts[eventName].map((event) => event.fn);
    }
  }
  /**
   * Get cached data for particular event
   * @param eventName - event name
   * @returns cached event data
   */
  getCache(eventName: string): EventData[] | EventData {
    return this._cache.get(eventName) || [];
  }

  /**
   * Enable debugging for all instances of the emitter
   * @param opts
   */
  static enableDebug(opts: { emit?: boolean; on?: boolean; off?: boolean }) {
    updateDebugStatus(opts);
  }

  /**
   * Returns DebugStatus
   */
  static get debugStatus(): DebugStatus {
    return debugStatus;
  }
}

// Adding aliases via declaration merging
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

function addToCache(this: BufferedEventEmitter, eventName: string, data: EventData | EventData[]) {
  if (!this._opts.cache) return;
  const arr = this._cache.get(eventName);
  const newArr = arr || [];
  if (newArr.length >= this._opts.cacheCapacity) {
    newArr.shift();
  }
  newArr.push(data);
  this._cache.set(eventName, newArr);
}
