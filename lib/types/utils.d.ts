import { BufferedEventEmitter } from "./bufferedEventEmitter";
import { ALL_EVENTS, EMIT_STATUS } from "./constants";
import { EventData, Listener, ListenerOptions } from "./types";
/**
 * Event Properties
 */
export declare class EventProp {
    name: string;
    fn: Listener;
    once: boolean;
    options: ListenerOptions | undefined;
    bucket?: EventData[];
    timeoutID?: ReturnType<typeof setTimeout>;
    constructor(name: string, fn: Listener, once: boolean, options: ListenerOptions | undefined);
}
declare type PauseEventName = string | typeof ALL_EVENTS;
declare type EmitStatus = typeof EMIT_STATUS[keyof typeof EMIT_STATUS];
export declare class PausedEvtsProp {
    name: PauseEventName;
    shouldQ: boolean;
    interval: number;
    status: EmitStatus;
    constructor(name: PauseEventName, status: EmitStatus, shouldQ: boolean, interval: number);
    updateProps({ status, shouldQ, interval, }: {
        status?: EmitStatus;
        shouldQ?: boolean;
        interval?: number;
    }): void;
    getProps(): {
        status: EmitStatus;
        shouldQ: boolean;
        interval: number;
        name: string;
    };
}
export declare function checkListenerOptionsEquality(obj1: ListenerOptions | undefined, obj2: ListenerOptions | undefined): boolean;
export declare function getListenerIdx(events: EventProp[], listener: Listener, options: ListenerOptions | undefined): number;
export declare function emitAfterTimeout(this: BufferedEventEmitter, payload: {
    name: string;
    data?: EventData;
}, ms: number): Promise<unknown>;
export declare function logger(type: "emit" | "on" | "off", eventName: string, eventData?: EventData | Listener): void;
export declare class EventController {
    flush(): void;
    off(): void;
}
export declare function attachControls(this: BufferedEventEmitter, control: EventController, eventProp: EventProp): void;
export declare function addToCache(this: BufferedEventEmitter, eventName: string, data: EventData | EventData[]): void;
export {};
//# sourceMappingURL=utils.d.ts.map