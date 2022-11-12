import { EventProp } from "./utils";

export type Events = {
  [eventName: string]: EventProp[];
};

export type ListenerOptions = {
  buffered: boolean;
  bufferCapacity?: number;
};

export type EventData = any;

export type Listener = (data: EventData) => void;
