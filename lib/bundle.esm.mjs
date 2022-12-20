const DEFAULT_IS_BUFFERED = false;
const DEFAULT_BUFFER_CAPACITY = 5; // when buffered = true, this applies
const DEFAULT_EMISSION_INTERVAL = 0; // when emission paused, intervald determines time between emissions
const DEFAULT_QUEUE_EMISSION = true;
const ALL_EVENTS = `__all-${Date.now()}`;
const DEFAULT_CACHE_CAPACITY = 20;
const DEFAULT_IS_CACHE = false;
const EMIT_STATUS = {
    PAUSED: "0",
    EMITTING: "1",
};

/**
 * Event Properties
 */
class EventProp {
    constructor(name, fn, once, options) {
        this.name = name;
        this.fn = fn;
        this.once = once;
        this.options = options;
        if (options === null || options === void 0 ? void 0 : options.buffered) {
            this.bucket = [];
            this.timeoutID = undefined;
        }
    }
}
// Paused Event Properties
class PausedEvtsProp {
    constructor(name, status, shouldQ, interval) {
        this.name = name;
        this.status = status;
        this.shouldQ = shouldQ;
        this.interval = interval;
    }
    updateProps({ status, shouldQ, interval, }) {
        if (status)
            this.status = status;
        if (shouldQ !== undefined)
            this.shouldQ = shouldQ;
        if (interval !== undefined)
            this.interval = interval;
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
function checkListenerOptionsEquality(obj1, obj2) {
    if (obj1 === obj2)
        return true;
    if (!obj1 || !obj2)
        return false;
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) {
        return false;
    }
    let key;
    for (key in obj1) {
        if (obj1[key] !== obj2[key]) {
            return false;
        }
    }
    return true;
}
function getListenerIdx(events, listener, options) {
    for (let i = 0; i < events.length; i++) {
        if (events[i].fn === listener && checkListenerOptionsEquality(events[i].options, options)) {
            return i;
        }
    }
    return -1;
}
function emitAfterTimeout(payload, ms) {
    let timeoutId;
    return new Promise((resolve) => (timeoutId = setTimeout(() => {
        this.emit(payload.name, payload.data);
        resolve(true);
    }, ms))).finally(() => {
        clearTimeout(timeoutId);
    });
}
function logger(type, eventName, eventData) {
    if ((type === "emit" && !BufferedEventEmitter.debugStatus.emit) ||
        (type === "on" && !BufferedEventEmitter.debugStatus.on) ||
        (type === "off" && !BufferedEventEmitter.debugStatus.off))
        return;
    if (type === "emit") {
        try {
            eventData = JSON.stringify(eventData);
        }
        catch (_a) {
            eventData = `Object with the following keys failed to stringify: ${Object.keys(eventData).join(",")}`;
        }
    }
    else if (["on", "off"].includes(type) && typeof eventData === "function") {
        eventData = eventData.toString();
    }
    const currentTime = new Date();
    const logTime = `${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}.${currentTime.getMilliseconds()}`;
    console.groupCollapsed(`%c[Event Type: ${type} | Event Name: ${eventName} | ${logTime}]`, "color: blue; font-size: 12px");
    console.log(`%c[Event Data: ${eventData}}]`, "color: #AD5D4E; font-size: 11px");
    console.groupEnd();
}
class EventController {
    flush() { }
    off() { }
}
const controls = new Map();
function attachControls(control, eventProp) {
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
function addToCache(eventName, data) {
    if (!this._opts.cache)
        return;
    const arr = this._cache.get(eventName);
    const newArr = arr || [];
    if (newArr.length >= this._opts.cacheCapacity) {
        newArr.shift();
    }
    newArr.push(data);
    this._cache.set(eventName, newArr);
}

var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class BufferedEventEmitter {
    constructor(options) {
        var _a, _b, _c, _d, _e;
        this._evts = {};
        this._opts = {
            buffered: (_a = options === null || options === void 0 ? void 0 : options.buffered) !== null && _a !== void 0 ? _a : DEFAULT_IS_BUFFERED,
            bufferCapacity: (_b = options === null || options === void 0 ? void 0 : options.bufferCapacity) !== null && _b !== void 0 ? _b : DEFAULT_BUFFER_CAPACITY,
            logger: (_c = options === null || options === void 0 ? void 0 : options.logger) !== null && _c !== void 0 ? _c : logger,
            cache: (_d = options === null || options === void 0 ? void 0 : options.cache) !== null && _d !== void 0 ? _d : DEFAULT_IS_CACHE,
            cacheCapacity: (_e = options === null || options === void 0 ? void 0 : options.cacheCapacity) !== null && _e !== void 0 ? _e : DEFAULT_CACHE_CAPACITY,
        };
        this._pEvtsConf = new Map([
            [
                ALL_EVENTS,
                new PausedEvtsProp(ALL_EVENTS, EMIT_STATUS.EMITTING, DEFAULT_QUEUE_EMISSION, DEFAULT_EMISSION_INTERVAL),
            ],
        ]);
        this._pEvtsQ = [];
        this._cache = new Map();
    }
    emit(eventName, data) {
        var _a, _b, _c, _d;
        if (!this._evts[eventName] || this._evts[eventName].length === 0) {
            return false;
        }
        const allEventsPaused = ((_a = this._pEvtsConf.get(ALL_EVENTS)) === null || _a === void 0 ? void 0 : _a.status) === EMIT_STATUS.PAUSED;
        const thisEventPaused = ((_b = this._pEvtsConf.get(eventName)) === null || _b === void 0 ? void 0 : _b.status) === EMIT_STATUS.PAUSED;
        if (allEventsPaused || thisEventPaused) {
            if (((_c = this._pEvtsConf.get(ALL_EVENTS)) === null || _c === void 0 ? void 0 : _c.shouldQ) || ((_d = this._pEvtsConf.get(eventName)) === null || _d === void 0 ? void 0 : _d.shouldQ))
                this._pEvtsQ.push({ name: eventName, data });
            return false;
        }
        // collect events here which are !(once && emitted)
        let eventProps = [];
        let didAnyEmit = false;
        // iterate through all registered events
        this._evts[eventName].forEach((event) => {
            var _a, _b, _c;
            let didEmit = false;
            // buffered event handling
            if ((_a = event === null || event === void 0 ? void 0 : event.options) === null || _a === void 0 ? void 0 : _a.buffered) {
                (_b = event === null || event === void 0 ? void 0 : event.bucket) === null || _b === void 0 ? void 0 : _b.push(data);
                const bufferCapacity = (_c = event === null || event === void 0 ? void 0 : event.options.bufferCapacity) !== null && _c !== void 0 ? _c : this._opts.bufferCapacity;
                if ((event === null || event === void 0 ? void 0 : event.bucket) && event.bucket.length >= bufferCapacity) {
                    event.fn(event.bucket);
                    addToCache.call(this, eventName, event.bucket);
                    didEmit = true;
                    didAnyEmit = true;
                    this._opts.logger("emit", eventName, event.bucket);
                    event.bucket = [];
                }
            }
            else {
                // non-buffered event handling
                event.fn(data);
                addToCache.call(this, eventName, data);
                didEmit = true;
                didAnyEmit = true;
                this._opts.logger("emit", eventName, data);
            }
            // filter out once emitted events
            if (!(event.once && didEmit)) {
                eventProps.push(event);
            }
        });
        this._evts[eventName] = eventProps;
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
    on(eventName, listener, options) {
        if (!this._evts[eventName]) {
            this._evts[eventName] = [];
        }
        // dedupe listeners
        let index = getListenerIdx(this._evts[eventName], listener, options);
        if (index !== -1)
            return false;
        const eventProp = new EventProp(eventName, listener, false, options);
        if ((options === null || options === void 0 ? void 0 : options.control) instanceof EventController) {
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
    once(eventName, listener, options) {
        if (!this._evts[eventName]) {
            this._evts[eventName] = [];
        }
        // dedupe listeners
        let index = getListenerIdx(this._evts[eventName], listener, options);
        if (index !== -1)
            return false;
        const eventProp = new EventProp(eventName, listener, true, options);
        if ((options === null || options === void 0 ? void 0 : options.control) instanceof EventController) {
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
    off(eventName, listener, options) {
        let index = getListenerIdx(this._evts[eventName], listener, options);
        if (index === -1)
            return false;
        this._evts[eventName].splice(index, 1);
        this._opts.logger("off", eventName, listener);
        return true;
    }
    flush(eventName, listener, options) {
        let didAnyEmit = false;
        let emittedOnceListenerIndexes = [];
        this._evts[eventName].forEach((event, idx) => {
            var _a;
            if (((_a = event === null || event === void 0 ? void 0 : event.options) === null || _a === void 0 ? void 0 : _a.buffered) && (event === null || event === void 0 ? void 0 : event.bucket) && event.bucket.length > 0) {
                const matchesListenerFn = listener && listener === event.fn;
                const matchesOptions = options && checkListenerOptionsEquality(options, event.options);
                const shouldFlush = (eventName && matchesListenerFn && matchesOptions) ||
                    (eventName && !listener && !options);
                if (shouldFlush) {
                    event.fn(event.bucket);
                    addToCache.call(this, eventName, event.bucket);
                    didAnyEmit = true;
                    this._opts.logger("emit", eventName, event.bucket);
                    event.bucket = [];
                    if (event.once)
                        emittedOnceListenerIndexes.push(idx);
                }
            }
        });
        this._evts[eventName] = this._evts[eventName].filter((_, idx) => !emittedOnceListenerIndexes.includes(idx));
        return didAnyEmit;
    }
    /**
     * Pause event emissions for all or provided event. Any subsequent event emissions will be swallowed or queued and
     * their respective listeners will not be invoked until resume() is called.
     * @param opts configure pausing using options
     * @param opts.name name for event to be paused
     * @param opts.queueEmissions if true, subsequent event emissions will be queued else swallowed
     * @param opts.emissionInterval interval in ms for dequeueing queued events. if interval is 0, the events are dequeued synchronously else asynchronously but in order
     */
    pause(opts) {
        var _a, _b;
        const queueEmissions = (_a = opts === null || opts === void 0 ? void 0 : opts.queueEmissions) !== null && _a !== void 0 ? _a : DEFAULT_QUEUE_EMISSION;
        const emissionInterval = (_b = opts === null || opts === void 0 ? void 0 : opts.emissionInterval) !== null && _b !== void 0 ? _b : DEFAULT_EMISSION_INTERVAL;
        if (typeof (opts === null || opts === void 0 ? void 0 : opts.eventName) === "string") {
            this._pEvtsConf.set(opts === null || opts === void 0 ? void 0 : opts.eventName, new PausedEvtsProp(opts === null || opts === void 0 ? void 0 : opts.eventName, EMIT_STATUS.PAUSED, queueEmissions, emissionInterval));
        }
        else {
            // delete all other paused events
            if (this._pEvtsConf.size > 1)
                this._pEvtsConf.clear();
            this._pEvtsConf.set(ALL_EVENTS, new PausedEvtsProp(ALL_EVENTS, EMIT_STATUS.PAUSED, queueEmissions, emissionInterval));
        }
    }
    /**
     * Resumes event emission for all or provided event
     * @param eventName: name for event to be resumed.
     * @returns void or Promise depending on emission interval value.
     */
    resume(eventName) {
        let pausedEvents = [];
        let emissionInterval = DEFAULT_EMISSION_INTERVAL;
        if (typeof eventName === "string") {
            if (this._pEvtsConf.get(eventName)) {
                const { shouldQ, status, interval } = this._pEvtsConf.get(eventName).getProps();
                this._pEvtsConf.delete(eventName);
                if (status === EMIT_STATUS.PAUSED) {
                    if (shouldQ) {
                        this._pEvtsQ = this._pEvtsQ.filter((o) => {
                            if (o.name === eventName) {
                                pausedEvents.push(o);
                                return false;
                            }
                            else
                                return true;
                        });
                        emissionInterval = interval;
                    }
                }
            }
        }
        else {
            if (this._pEvtsConf.size > 1) {
                // use default values when eventName is not provided
                emissionInterval = DEFAULT_EMISSION_INTERVAL;
                pausedEvents = this._pEvtsQ;
                this._pEvtsQ = [];
            }
            else if (this._pEvtsConf.get(ALL_EVENTS)) {
                const { shouldQ, status, interval } = this._pEvtsConf.get(ALL_EVENTS).getProps();
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
            const dequeueAsync = () => __awaiter(this, void 0, void 0, function* () {
                for (const item of pausedEvents) {
                    yield emitAfterTimeout.call(this, item, emissionInterval);
                }
            });
            return dequeueAsync();
            // sync
        }
        else {
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
    offAll(eventName) {
        var _a;
        if (eventName && ((_a = this._evts[eventName]) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            delete this._evts[eventName];
            this._pEvtsQ = this._pEvtsQ.filter((e) => e.name !== eventName);
            this._pEvtsConf.delete(eventName);
            this._cache.delete(eventName);
            return true;
        }
        else
            return false;
    }
    /**
     * Removes all listeners and queued events for the instance.
     */
    cleanup() {
        this._pEvtsConf.clear();
        this._pEvtsQ = [];
        this._cache.clear();
        this._evts = {};
    }
    listeners(eventName) {
        if (eventName === undefined) {
            return this._evts;
        }
        else {
            return this._evts[eventName].map((event) => event.fn);
        }
    }
    getCache(eventName) {
        return this._cache.get(eventName) || [];
    }
    /**
     * Enable debugging for all instances of the emitter
     * @param opts
     */
    static enableDebug(opts) {
        BufferedEventEmitter.debugStatus = Object.assign(Object.assign({}, BufferedEventEmitter.debugStatus), opts);
    }
}
BufferedEventEmitter.debugStatus = { emit: false, on: false, off: false };
BufferedEventEmitter.prototype.addListener = BufferedEventEmitter.prototype.on;
BufferedEventEmitter.prototype.removeListener = BufferedEventEmitter.prototype.off;

export { BufferedEventEmitter, EventController };
