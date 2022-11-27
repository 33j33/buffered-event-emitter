import { BufferedEventEmitter } from "./bufferedEventEmitter";
import { EventData, Listener, ListenerOptions } from "./types";
export declare class EventProp {
    fn: Listener;
    once: boolean;
    options: ListenerOptions;
    bucket?: EventData[];
    timeoutID?: ReturnType<typeof setTimeout>;
    constructor(fn: Listener, once: boolean, options: ListenerOptions);
}
export declare function checkListenerOptionsEquality(obj1: ListenerOptions, obj2: ListenerOptions): boolean;
export declare function getListenerIdx(events: EventProp[], listener: Listener, options: ListenerOptions): number;
export declare function emitAfterTimeout(this: BufferedEventEmitter, payload: {
    eventName: string;
    data?: EventData;
}, ms: number): Promise<unknown>;
//# sourceMappingURL=utils.d.ts.map