class EventProp {
    constructor(fn, once, options) {
        this.fn = fn;
        this.once = once;
        this.options = options;
        if (options === null || options === void 0 ? void 0 : options.buffered) {
            this.bucket = [];
            this.timeoutID = undefined;
        }
    }
}
function checkListenerOptionsEquality(obj1, obj2) {
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
        if (events[i].fn === listener &&
            checkListenerOptionsEquality(events[i].options, options)) {
            return i;
        }
    }
    return -1;
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
var __classPrivateFieldGet = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _BufferedEventEmitter_instances, _BufferedEventEmitter_emitAfterTimeout;
class BufferedEventEmitter {
    constructor(options) {
        var _a, _b;
        _BufferedEventEmitter_instances.add(this);
        this._events = {};
        this._defaultListenerOptions = {
            buffered: (_a = options === null || options === void 0 ? void 0 : options.buffered) !== null && _a !== void 0 ? _a : false,
            bufferCapacity: (_b = options === null || options === void 0 ? void 0 : options.bufferCapacity) !== null && _b !== void 0 ? _b : 5,
        };
        this._status = "emitting";
        this._shouldQueueEmissions = true;
        this._emissionInterval = 0;
        this._queue = [];
    }
    emit(eventName, data) {
        if (!this._events[eventName] || this._events[eventName].length === 0) {
            return false;
        }
        if (this._status === "paused") {
            if (this._shouldQueueEmissions)
                this._queue.push({ eventName, data });
            return false;
        }
        // collect events here which are !(once && emitted)
        let eventProps = [];
        let didAnyEmit = false;
        // iterate through all registered events
        this._events[eventName].forEach((event) => {
            var _a, _b;
            let didEmit = false;
            // buffered event handling
            if (event.options.buffered) {
                (_a = event === null || event === void 0 ? void 0 : event.bucket) === null || _a === void 0 ? void 0 : _a.push(data);
                const bufferCapacity = (_b = event.options.bufferCapacity) !== null && _b !== void 0 ? _b : this._defaultListenerOptions.bufferCapacity;
                if ((event === null || event === void 0 ? void 0 : event.bucket) && event.bucket.length >= bufferCapacity) {
                    event.fn(event.bucket);
                    didEmit = true;
                    didAnyEmit = true;
                    this.logger("emit", eventName, event.bucket);
                    event.bucket = [];
                }
            }
            else {
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
     * If the combination of event name, listener and options is already present for the given event name the listener is not added a second time.
     * @param eventName - Name of the event, listener will be added to
     * @param listener - Function that will be called each time event is emitted
     * @param options - Config options for listener
     * @returns listener status if it was added or not
     */
    on(eventName, listener, options = this._defaultListenerOptions) {
        if (!this._events[eventName]) {
            this._events[eventName] = [];
        }
        let index = getListenerIdx(this._events[eventName], listener, options);
        if (index !== -1)
            return false;
        this._events[eventName].push(new EventProp(listener, false, options));
        this.logger("on", eventName, listener);
        return true;
    }
    /**
     * Adds a one-time event listener for given event name and options.
     * If the combination of event name, listener and options is already present for the given event name the listener is not added a second time.
     * The first time event is triggered, this listener is invoked and then removed.
     * @param eventName - Name of the event, listener will be added to
     * @param listener - Function that will be called each time event is emitted
     * @param options - Config options for listener
     * @returns listener status if it was added or not
     */
    once(eventName, listener, options = this._defaultListenerOptions) {
        if (!this._events[eventName]) {
            this._events[eventName] = [];
        }
        let index = getListenerIdx(this._events[eventName], listener, options);
        if (index !== -1)
            return false;
        this._events[eventName].push(new EventProp(listener, true, options));
        this.logger("on", eventName, listener);
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
    off(eventName, listener, options = this._defaultListenerOptions) {
        let index = getListenerIdx(this._events[eventName], listener, options);
        if (index === -1)
            return false;
        this._events[eventName].splice(index, 1);
        this.logger("off", eventName, listener);
        return true;
    }
    flush(eventName, listener, options) {
        let didAnyEmit = false;
        let emittedOnceListenerIndexes = [];
        this._events[eventName].forEach((event, idx) => {
            if (event.options.buffered && (event === null || event === void 0 ? void 0 : event.bucket) && event.bucket.length > 0) {
                const matchesListenerFn = listener && listener === event.fn;
                const matchesOptions = options && checkListenerOptionsEquality(options, event.options);
                const shouldFlush = (eventName && matchesListenerFn && matchesOptions) ||
                    (eventName && !listener && !options);
                if (shouldFlush) {
                    event.fn(event.bucket);
                    didAnyEmit = true;
                    this.logger("emit", eventName, event.bucket);
                    event.bucket = [];
                    if (event.once)
                        emittedOnceListenerIndexes.push(idx);
                }
            }
        });
        this._events[eventName] = this._events[eventName].filter((_, idx) => !emittedOnceListenerIndexes.includes(idx));
        return didAnyEmit;
    }
    /**
     * Pause event emissions. Any subsequent event emissions will be swallowed or queued and
     * their respective listeners will not be invoked until resume() is called.
     * @param queueEmissions if true, subsequent event emissions will be queued else swallowed
     * @param emissionInterval interval for dequeueing queued events. if interval is 0, the events are dequeued synchronously else asynchronously but in order
     */
    pause(queueEmissions = true, emissionInterval = 0) {
        this._shouldQueueEmissions = queueEmissions;
        this._emissionInterval = emissionInterval;
        this._status = "paused";
    }
    /**
     * Resumes event emission
     * @returns void or Promise depending on emission interval value.
     */
    resume() {
        this._status = "emitting";
        if (this._shouldQueueEmissions) {
            if (this._emissionInterval > 0) {
                const dequeueAsync = () => __awaiter(this, void 0, void 0, function* () {
                    for (const item of this._queue) {
                        yield __classPrivateFieldGet(this, _BufferedEventEmitter_instances, "m", _BufferedEventEmitter_emitAfterTimeout).call(this, item, this._emissionInterval);
                    }
                });
                return dequeueAsync();
            }
            else {
                this._queue.forEach(({ eventName, data }) => {
                    this.emit(eventName, data);
                });
                this._queue = [];
            }
        }
    }
    cleanup(eventName) {
        var _a;
        if (eventName && ((_a = this._events[eventName]) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            this._events[eventName] = [];
            this._queue = this._queue.filter((e) => e.eventName !== eventName);
        }
        else {
            this._queue = [];
            this._events = {};
        }
    }
    listeners(eventName) {
        if (eventName === undefined) {
            return this._events;
        }
        else {
            return this._events[eventName].map((event) => event.fn);
        }
    }
    // aliases
    /**
     * Adds an event listener for given event name and options.
     * If the combination of listener and options is already present the given event name the listener is not added a second time.
     * @param eventName - Name of the event, listener was added to
     * @param listener - Function that will be called each time event is emitted
     * @param options - Config options for listener
     * @returns listener status if it was added or not
     */
    addListener(eventName, listener, options = this._defaultListenerOptions) {
        return this.on(eventName, listener, options);
    }
    /**
     * Removes an event listener previously registered with on() or addListener().
     * The event listener to be removed is identified using a combination of the event name, the event listener function itself, and provided options
     * @param eventName  Name of the event, listener will be added to
     * @param listener - Listener function to be removed from the registered listeners array
     * @param options - Config options for listener
     * @returns listener status if it was removed or not
     */
    removeListener(eventName, listener, options = this._defaultListenerOptions) {
        return this.off(eventName, listener, options);
    }
    logger(type, eventName, eventData) {
        if ((type === "emit" && !BufferedEventEmitter.debugEnabled.emit) ||
            (type === "on" && !BufferedEventEmitter.debugEnabled.on) ||
            (type === "off" && !BufferedEventEmitter.debugEnabled.off))
            return;
        if (type === "emit") {
            try {
                eventData = JSON.stringify(eventData);
            }
            catch (_a) {
                eventData = `Object with the following keys failed to stringify: ${Object.keys(eventData).join(",")}`;
            }
        }
        else if (type === "on" && typeof eventData === "function") {
            eventData = eventData.toString();
        }
        const currentTime = new Date();
        const logTime = `${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}.${currentTime.getMilliseconds()}`;
        console.groupCollapsed(`%c[Event Type: ${type} | Event Name: ${eventName} | ${logTime}]`, "color: blue; font-size: 12px");
        console.log(`%c[Event Data: ${eventData}}]`, "color: #AD5D4E; font-size: 11px");
        console.groupEnd();
    }
    /**
     * Enable debugging for all instances of the emitter
     * @param opts
     */
    static enableDebug(opts) {
        BufferedEventEmitter.debugEnabled = Object.assign(Object.assign({}, BufferedEventEmitter.debugEnabled), opts);
    }
}
_BufferedEventEmitter_instances = new WeakSet(), _BufferedEventEmitter_emitAfterTimeout = function _BufferedEventEmitter_emitAfterTimeout(payload, ms) {
    let timeoutId;
    return new Promise((resolve) => (timeoutId = setTimeout(() => {
        this.emit(payload.eventName, payload.data);
        resolve(true);
    }, ms))).finally(() => {
        clearTimeout(timeoutId);
    });
};
BufferedEventEmitter.debugEnabled = { emit: false, on: false, off: false };

export { BufferedEventEmitter };
