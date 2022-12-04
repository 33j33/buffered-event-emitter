import { BufferedEventEmitter } from "./bufferedEventEmitter";
import { EventData, Listener, ListenerOptions } from "./types";
export declare class EventProp {
    name: string;
    fn: Listener;
    once: boolean;
    options: ListenerOptions | undefined;
    bucket?: EventData[];
    timeoutID?: ReturnType<typeof setTimeout>;
    constructor(name: string, fn: Listener, once: boolean, options: ListenerOptions | undefined);
}
export declare class EventController {
    flush(): void;
    off(): void;
}
export declare function checkListenerOptionsEquality(obj1: ListenerOptions | undefined, obj2: ListenerOptions | undefined): boolean;
export declare function getListenerIdx(events: EventProp[], listener: Listener, options: ListenerOptions | undefined): number;
export declare function emitAfterTimeout(this: BufferedEventEmitter, payload: {
    eventName: string;
    data?: EventData;
}, ms: number): Promise<unknown>;
export declare function logger(type: "emit" | "on" | "off", eventName: string, eventData?: EventData | Listener): void;
export declare function attachControls(this: BufferedEventEmitter, control: EventController, eventProp: EventProp): void;
//# sourceMappingURL=utils.d.ts.map