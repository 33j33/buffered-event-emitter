# Buffered Event Emitter

- supports buffering events with configurable buffer capacity.
- supports pausing and resuming event emission.
- has a logger for logging `emit` and `subscribe` actions.
- based on [node events api](https://nodejs.org/api/events.html)

## Install

```
npm install buffered-event-emitter
```

## Usage

```typescript
import { BufferedEventEmitter } from "buffered-event-emitter";
const bEmitter = new BufferedEventEmitter();

function ping(data: string) {
  console.log("emitted data: ", data);
}

bEmitter.on("ping", ping);
bEmitter.emit("ping", "first emit");
// logs -> emitted data:  first emit
bEmitter.emit("ping", "second emit");
// logs -> emitted data:  second emit

bEmitter.off("ping", ping); // listener is removed
bEmitter.emit("ping", "third emit");
// doesn't log anything as listener is removed

function bufferdPing(data: string[]) {
  console.log("buffered data: ", data);
}
// adding a buffered listener which will receive emissions in batch of 2
bEmitter.on("ping", bufferdPing, { buffered: true, bufferCapacity: 2 });
bEmitter.emit("ping", "first emit");
// doesn't log anything
bEmitter.emit("ping", "second emit");
// logs -> buffered data:  ['first emit', 'second emit']
bEmitter.emit("ping", "third emit");
// doesn't log anything

// flushes any events in the buffer associated with provided listener
bEmitter.flush("ping", bufferdPing, { buffered: true, bufferCapacity: 2 });
// logs -> buffered data:  ['third emit']
```
