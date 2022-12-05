(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["buffered-event-emitter"] = {}));
})(this, (function (exports) { 'use strict';

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
    class EventController {
        flush() { }
        off() { }
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
            this.emit(payload.eventName, payload.data);
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

    var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    // when buffered
    const DEFAULT_BUFFER_CAPACITY = 5;
    // when emission paused
    const DEFAULT_EMISSION_INTERVAL = 0;
    class BufferedEventEmitter {
        constructor(options) {
            var _a, _b, _c;
            this._events = {};
            this._options = {
                buffered: (_a = options === null || options === void 0 ? void 0 : options.buffered) !== null && _a !== void 0 ? _a : false,
                bufferCapacity: (_b = options === null || options === void 0 ? void 0 : options.bufferCapacity) !== null && _b !== void 0 ? _b : DEFAULT_BUFFER_CAPACITY,
                logger: (_c = options === null || options === void 0 ? void 0 : options.logger) !== null && _c !== void 0 ? _c : logger,
            };
            this._status = "emitting";
            this._queueEmissions = true;
            this._emissionInterval = DEFAULT_EMISSION_INTERVAL;
            this._queue = [];
        }
        emit(eventName, data) {
            if (!this._events[eventName] || this._events[eventName].length === 0) {
                return false;
            }
            if (this._status === "paused") {
                if (this._queueEmissions)
                    this._queue.push({ eventName, data });
                return false;
            }
            // collect events here which are !(once && emitted)
            let eventProps = [];
            let didAnyEmit = false;
            // iterate through all registered events
            this._events[eventName].forEach((event) => {
                var _a, _b, _c;
                let didEmit = false;
                // buffered event handling
                if ((_a = event === null || event === void 0 ? void 0 : event.options) === null || _a === void 0 ? void 0 : _a.buffered) {
                    (_b = event === null || event === void 0 ? void 0 : event.bucket) === null || _b === void 0 ? void 0 : _b.push(data);
                    const bufferCapacity = (_c = event === null || event === void 0 ? void 0 : event.options.bufferCapacity) !== null && _c !== void 0 ? _c : this._options.bufferCapacity;
                    if ((event === null || event === void 0 ? void 0 : event.bucket) && event.bucket.length >= bufferCapacity) {
                        event.fn(event.bucket);
                        didEmit = true;
                        didAnyEmit = true;
                        this._options.logger("emit", eventName, event.bucket);
                        event.bucket = [];
                    }
                }
                else {
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
        on(eventName, listener, options) {
            if (!this._events[eventName]) {
                this._events[eventName] = [];
            }
            // dedupe listeners
            let index = getListenerIdx(this._events[eventName], listener, options);
            if (index !== -1)
                return false;
            const eventProp = new EventProp(eventName, listener, false, options);
            if ((options === null || options === void 0 ? void 0 : options.control) instanceof EventController) {
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
        once(eventName, listener, options) {
            if (!this._events[eventName]) {
                this._events[eventName] = [];
            }
            // dedupe listeners
            let index = getListenerIdx(this._events[eventName], listener, options);
            if (index !== -1)
                return false;
            const eventProp = new EventProp(eventName, listener, true, options);
            if ((options === null || options === void 0 ? void 0 : options.control) instanceof EventController) {
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
        off(eventName, listener, options) {
            let index = getListenerIdx(this._events[eventName], listener, options);
            if (index === -1)
                return false;
            this._events[eventName].splice(index, 1);
            this._options.logger("off", eventName, listener);
            return true;
        }
        flush(eventName, listener, options) {
            let didAnyEmit = false;
            let emittedOnceListenerIndexes = [];
            this._events[eventName].forEach((event, idx) => {
                var _a;
                if (((_a = event === null || event === void 0 ? void 0 : event.options) === null || _a === void 0 ? void 0 : _a.buffered) && (event === null || event === void 0 ? void 0 : event.bucket) && event.bucket.length > 0) {
                    const matchesListenerFn = listener && listener === event.fn;
                    const matchesOptions = options && checkListenerOptionsEquality(options, event.options);
                    const shouldFlush = (eventName && matchesListenerFn && matchesOptions) ||
                        (eventName && !listener && !options);
                    if (shouldFlush) {
                        event.fn(event.bucket);
                        didAnyEmit = true;
                        this._options.logger("emit", eventName, event.bucket);
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
         * @param emissionInterval interval in ms for dequeueing queued events. if interval is 0, the events are dequeued synchronously else asynchronously but in order
         */
        pause(queueEmissions = true, emissionInterval = DEFAULT_EMISSION_INTERVAL) {
            this._queueEmissions = queueEmissions;
            this._emissionInterval = emissionInterval;
            this._status = "paused";
        }
        /**
         * Resumes event emission
         * @returns void or Promise depending on emission interval value.
         */
        resume() {
            this._status = "emitting";
            if (this._queueEmissions) {
                if (this._emissionInterval > DEFAULT_EMISSION_INTERVAL) {
                    const dequeueAsync = () => __awaiter(this, void 0, void 0, function* () {
                        for (const item of this._queue) {
                            yield emitAfterTimeout.call(this, item, this._emissionInterval);
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
        /**
         * Remove all listeners for the provided event name.
         * @param eventName - event name
         * @returns `true` if any listener was removed for the event `false` otherwise.
         */
        offAll(eventName) {
            var _a;
            if (eventName && ((_a = this._events[eventName]) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                delete this._events[eventName];
                this._queue = this._queue.filter((e) => e.eventName !== eventName);
                return true;
            }
            else
                return false;
        }
        /**
         * Removes all listeners and queued events for the instance.
         */
        cleanup() {
            this._queue = [];
            this._events = {};
        }
        listeners(eventName) {
            if (eventName === undefined) {
                return this._events;
            }
            else {
                return this._events[eventName].map((event) => event.fn);
            }
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

    exports.BufferedEventEmitter = BufferedEventEmitter;
    exports.EventController = EventController;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
(function () { if (typeof window !== "undefined") {
        window.BufferedEventEmitter = window["buffered-event-emitter"].BufferedEventEmitter
        window.EventController = window["buffered-event-emitter"].EventController
      }})()
