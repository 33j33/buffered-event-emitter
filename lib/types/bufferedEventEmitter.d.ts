import { DebugStatus, EventData, Events, IBufferedEventEmitter, InitOptions, Listener, ListenerOptions } from "./types";
import { PausedEvtsProp } from "./utils";
export declare class BufferedEventEmitter implements IBufferedEventEmitter {
    protected _evts: Events;
    protected _opts: Required<InitOptions>;
    protected _pEvtsConf: Map<string, PausedEvtsProp>;
    protected _pEvtsQ: {
        name: string;
        data: EventData;
    }[];
    protected _cache: Map<string, EventData[]>;
    constructor(options?: InitOptions);
    /**
     *
     * Synchronously invokes each of the listeners registered for the event named eventName in the order they were registered.
     * Returns true if any listener was invoked, false otherwise.
     * @param eventName - event name
     * @returns event emitted status
     */
    emit(eventName: string): boolean;
    /**
     * Synchronously invokes each of the listeners registered for the event named eventName with eventData as argument, in the order they were registered.
     * Returns true if any listener was invoked, false otherwise.
     * @param eventName - event name
     * @param data - argument to be passed to be listener when invoking it
     * @returns event emitted status
     */
    emit(eventName: string, data: EventData): boolean;
    /**
     * Adds an event listener for given event name and options.
     * If the combination of event name, listener and options is already present for the given event name the listener is not added a second time.
     * @param eventName - Name of the event, listener will be added to
     * @param listener - Function that will be called each time event is emitted
     * @param options - Config options for listener
     * @returns listener status if it was added or not
     */
    on(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
    /**
     * Adds a one-time event listener for given event name and options.
     * If the combination of event name, listener and options is already present for the given event name the listener is not added a second time.
     * The first time event is triggered, this listener is invoked and then removed.
     * @param eventName - Name of the event, listener will be added to
     * @param listener - Function that will be called each time event is emitted
     * @param options - Config options for listener
     * @returns `true` if listener was added `false` otherwise.
     */
    once(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
    /**
     * Removes an event listener previously registered with on() or addListener().
     * The event listener to be removed is identified using a combination of the event name, the event listener function itself, and provided options
     * @param eventName - Name of the event, listener was added to
     * @param listener - Listener function to be removed from the registered listeners array
     * @param options - Config options for listener
     * @returns `true` if listener was removed `false` otherwise.
     */
    off(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
    /**
     * Flush all buffered events for all listeners for given event name.
     * @param eventName
     * @returns true if any events were emitted, else false
     */
    flush(eventName: string): boolean;
    /**
     * Flush all buffered events for listener identified by combination of given event name, listener and options.
     * @param eventName
     * @param listener
     * @param options
     * @returns true if any events were emitted, else false
     */
    flush(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
    /**
     * Pause event emissions for all or provided event. Any subsequent event emissions will be swallowed or queued and
     * their respective listeners will not be invoked until resume() is called.
     * @param opts configure pausing using options
     * @param opts.name name for event to be paused
     * @param opts.queueEmissions if true, subsequent event emissions will be queued else swallowed
     * @param opts.emissionInterval interval in ms for dequeueing queued events. if interval is 0, the events are dequeued synchronously else asynchronously but in order
     */
    pause(opts?: {
        eventName?: string;
        queueEmissions?: boolean;
        emissionInterval?: number;
    }): void;
    /**
     * Resumes event emission for all or provided event
     * @param eventName: name for event to be resumed.
     * @returns void or Promise depending on emission interval value.
     */
    resume(eventName?: string): Promise<void> | void;
    /**
     * Remove all listeners for the provided event name.
     * @param eventName - event name
     * @returns `true` if any listener was removed for the event `false` otherwise.
     */
    offAll(eventName: string): Boolean;
    /**
     * Removes all listeners and queued events for the instance.
     */
    cleanup(): void;
    listeners(): Events;
    listeners(eventName: string): Listener[];
    /**
     * Get cached data for particular event
     * @param eventName - event name
     * @returns cached event data
     */
    getCache(eventName: string): EventData[] | EventData;
    /**
     * Enable debugging for all instances of the emitter
     * @param opts
     */
    static enableDebug(opts: {
        emit?: boolean;
        on?: boolean;
        off?: boolean;
    }): void;
    /**
     * Returns DebugStatus
     */
    static get debugStatus(): DebugStatus;
}
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
//# sourceMappingURL=bufferedEventEmitter.d.ts.map