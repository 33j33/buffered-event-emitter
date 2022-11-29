import { EventProp, logger } from "./utils";

export type Events = {
  [eventName: string]: EventProp[];
};

export type ListenerOptions = {
  buffered: boolean;
  bufferCapacity?: number;
};

export type InitOptions = Partial<ListenerOptions> & {
  logger?: typeof logger;
};

export type EventData = any;

export type Listener = (data: EventData) => void;
