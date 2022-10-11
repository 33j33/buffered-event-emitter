import { EventProp } from "./utils";
export declare type Events = {
    [eventName: string]: EventProp[];
};
export declare type ListenerOptions = {
    buffered?: boolean;
    bufferCapacity?: number;
};
export declare type EventData = any;
export declare type Listener = (data: EventData) => void;
//# sourceMappingURL=types.d.ts.map