import { EventController, EventProp, logger } from "./utils";

export type Events = {
  [eventName: string]: EventProp[];
};

export type ListenerOptions = {
  buffered?: boolean;
  bufferCapacity?: number;
  control?: EventController;
};

export type BufferOptions = Omit<ListenerOptions, "control">;

export type InitOptions = BufferOptions & {
  logger?: typeof logger;
};

export type EventData = any;

export type Listener = (data: EventData) => void;
