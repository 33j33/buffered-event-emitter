import { EventController, EventProp, logger } from "./utils";
export declare type Events = {
    [eventName: string]: EventProp[];
};
export declare type ListenerOptions = {
    buffered?: boolean;
    bufferCapacity?: number;
    control?: EventController;
};
export declare type BufferOptions = Omit<ListenerOptions, "control">;
export declare type InitOptions = BufferOptions & {
    logger?: typeof logger;
};
export declare type EventData = any;
export declare type Listener = (data: EventData) => void;
//# sourceMappingURL=types.d.ts.map