import { EventProp, logger } from "./utils";
export declare type Events = {
    [eventName: string]: EventProp[];
};
export declare type ListenerOptions = {
    buffered: boolean;
    bufferCapacity?: number;
};
export declare type InitOptions = Partial<ListenerOptions> & {
    logger?: typeof logger;
};
export declare type EventData = any;
export declare type Listener = (data: EventData) => void;
//# sourceMappingURL=types.d.ts.map