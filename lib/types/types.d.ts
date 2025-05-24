import { EventController, EventProp, logger } from "./utils";
export declare type Events = {
    [eventName: string]: EventProp[];
};
export interface IBufferedEventEmitter {
    emit(eventName: string, data?: EventData): boolean;
    on(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
    once(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
    off(eventName: string, listener: Listener, options?: ListenerOptions): boolean;
    flush(eventName: string, listener?: Listener, options?: ListenerOptions): boolean;
    pause(opts?: {
        eventName?: string;
        queueEmissions?: boolean;
        emissionInterval?: number;
    }): void;
    resume(eventName?: string): Promise<void> | void;
    offAll(eventName: string): Boolean;
    cleanup(): void;
    listeners(eventName?: string): Listener[];
    getCache(eventName: string): EventData[];
}
export declare type ListenerOptions = {
    buffered?: boolean;
    bufferCapacity?: number;
    control?: EventController;
};
export declare type BufferOptions = Omit<ListenerOptions, "control">;
export declare type InitOptions = BufferOptions & {
    logger?: typeof logger;
    cache?: boolean;
    cacheCapacity?: number;
};
export declare type DebugStatus = {
    emit: Boolean;
    on: Boolean;
    off: Boolean;
};
export declare type EventData = any;
export declare type Listener = (data: EventData) => void;
//# sourceMappingURL=types.d.ts.map