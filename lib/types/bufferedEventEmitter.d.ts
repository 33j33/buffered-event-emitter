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
    emit(eventName: string): Boolean;
    emit(eventName: string, data: EventData): Boolean;
    on(eventName: string, listener: Listener, options?: ListenerOptions): BufferedEventEmitter;
    once(eventName: string, listener: Listener, options?: ListenerOptions): BufferedEventEmitter;
    removeListener(eventName: string, listener: Listener, options?: ListenerOptions): BufferedEventEmitter;
    flush(eventName: string): void;
    flush(eventName: string, listener: Listener, options: ListenerOptions): Boolean;
    pause(queueEmissions?: boolean, emissionInterval?: number): void;
    resume(): Promise<void> | void;
    listeners(): Events;
    listeners(eventName: string): Listener[];
    addListener(eventName: string, listener: Listener, options?: ListenerOptions): BufferedEventEmitter;
    off(eventName: string, listener: Listener, options?: ListenerOptions): BufferedEventEmitter;
    _logger(type: "emit" | "subscribe", eventName: string, eventData?: any): void;
    static enableDebug(logEmit?: boolean, logSubscribe?: boolean): void;
}
export {};
//# sourceMappingURL=bufferedEventEmitter.d.ts.map