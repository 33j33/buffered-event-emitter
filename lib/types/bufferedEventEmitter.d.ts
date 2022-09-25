declare type Events = {
    [eventName: string]: EventProp[];
};
declare type ListenerOptions = {
    buffered?: boolean;
    bufferCapacity?: number;
};
declare type EventData = any;
declare type Listener = (data: EventData) => void;
declare class EventProp {
    fn: Listener;
    once: boolean;
    options: ListenerOptions;
    bucket?: any[];
    timeoutID?: ReturnType<typeof setTimeout>;
    constructor(fn: Listener, once: boolean, options: ListenerOptions);
}
export declare class BufferedEventEmitter {
    #private;
    protected _events: Events;
    protected _defaultListenerOptions: Required<ListenerOptions>;
    protected _status: "paused" | "emitting";
    protected _shouldQueueEmissions: boolean;
    protected _emissionInterval: number;
    protected _queue: {
        eventName: string;
        data?: EventData;
    }[];
    protected static debugEnabled: {
        logEmit: boolean;
        logSubscribe: boolean;
    };
    constructor(options?: ListenerOptions);
    /**
     *
     * Synchronously invokes each of the listeners registered for the event named eventName in the order they were registered.
     * Returns true if any listener was invoked, false otherwise.
     * @param eventName - event name
     *  @returns event emitted status
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
     * If the combination of listener and options is already for the given event name the listener is not added a second time.
     * @param eventName - Name of the event, listener will be added to
     * @param listener - Function that will be called each time event is emitted
     * @param options - Config options for listener
     * @returns listener status if it was added or not
     */
    on(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
    /**
     * Adds a one-time event listener for given event name and options.
     * If the combination of listener and options is already for the given event name the listener is not added a second time.
     * The next time event is triggered, this listener is invoked and then removed.
     * @param eventName - Name of the event, listener will be added to
     * @param listener - Function that will be called each time event is emitted
     * @param options - Config options for listener
     * @returns listener status if it was added or not
     */
    once(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
    /**
     * Removes an event listener previously registered with on() or addListener().
     * The event listener to be removed is identified using a combination of the event name, the event listener function itself, and provided options
     * @param eventName - Name of the event, listener was added to
     * @param listener - Listener function to be removed from the registered listeners array
     * @param options - Config options for listener
     * @returns listener status if it was removed or not
     */
    removeListener(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
    /**
     * Flush all buffered events for listeners for given event name.
     * @param eventName
     * @returns true if any events were emitted, else false
     */
    flush(eventName: string): boolean;
    /**
     * Flush all buffered events for given combination of event name, listener and options.
     * @param eventName
     * @param listener
     * @param options
     * @returns true if any events were emitted, else false
     */
    flush(eventName: string, listener: Listener, options: ListenerOptions): boolean;
    /**
     * Pause event emissions. Any subsequent event emissions will be stopped or queued and
     * their respective listeners will not be invoked until resume() is called.
     * @param queueEmissions if true, subsequent event emissions will be queued else stopped
     * @param emissionInterval interval for dequeueing queued events. if interval is 0, the events are dequeued in synchronously
     */
    pause(queueEmissions?: boolean, emissionInterval?: number): void;
    /**
     * Resumes event emission
     * @returns void or Promise depending on emission interval value.
     */
    resume(): Promise<void> | void;
    listeners(): Events;
    listeners(eventName: string): Listener[];
    /**
     * Adds an event listener for given event name and options.
     * If the combination of listener and options is already for the given event name the listener is not added a second time.
     * @param eventName - Name of the event, listener was added to
     * @param listener - Function that will be called each time event is emitted
     * @param options - Config options for listener
     * @returns listener status if it was added or not
     */
    addListener(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
    /**
     * Removes an event listener previously registered with on() or addListener().
     * The event listener to be removed is identified using a combination of the event name, the event listener function itself, and provided options
     * @param eventName - Name of the event, listener will be added to
     * @param listener - Listener function to be removed from the registered listeners array
     * @param options - Config options for listener
     * @returns listener status if it was removed or not
     */
    off(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
    logger(type: "emit" | "subscribe", eventName: string, eventData?: EventData | Listener): void;
    static enableDebug(logEmit?: boolean, logSubscribe?: boolean): void;
}
export {};
//# sourceMappingURL=bufferedEventEmitter.d.ts.map