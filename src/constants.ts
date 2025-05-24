export const DEFAULT_IS_BUFFERED = false;
export const DEFAULT_BUFFER_CAPACITY = 5; // when buffered = true, this applies
export const DEFAULT_EMISSION_INTERVAL = 0; // when emission paused, intervald determines time between emissions
export const DEFAULT_QUEUE_EMISSION = true;
export const ALL_EVENTS = `__all-${Date.now()}` as const;
export const DEFAULT_CACHE_CAPACITY = 20;
export const DEFAULT_IS_CACHE = false;
export const EMIT_STATUS = {
  PAUSED: "0",
  EMITTING: "1",
} as const;
export const DEFAULT_BUFFER_INACTIVITY_TIMEOUT = 0; // inactivity timeout default (in ms). 0 means “no auto-flush”.