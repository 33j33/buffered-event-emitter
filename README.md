![](https://badgen.net/badge/icon/typescript?icon=typescript&label)
![](https://badgen.net/npm/types/buffered-event-emitter)
![](https://badgen.net/github/license/micromatch/micromatch)
![](https://badgen.net/npm/dt/buffered-event-emitter)
![](https://badgen.net/bundlephobia/dependency-count/buffered-event-emitter)
![](https://badgen.net/bundlephobia/min/buffered-event-emitter)
![](https://badgen.net/bundlephobia/minzip/buffered-event-emitter)

# Buffered Event Emitter <!-- omit in toc -->

- Buffer events with configurable buffer capacity.
- Pause and resume event emission.
- Log event emission, adding and removing listeners (`emit`, `on`, `off` actions).
- Tiny, 4.7kb minified.
- Works for both nodejs and browser.
- Based on [node events api](https://nodejs.org/api/events.html)
- Typescript support

## Table of Contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
  - [Usage in Node](#usage-in-node)
  - [Usage in Browser](#usage-in-browser)
- [API](#api)
  - [new BufferedEventEmitter(options?)](#new-bufferedeventemitteroptions)
  - [emit(eventName, data?)](#emiteventname-data)
  - [on(eventName, listener, options?)](#oneventname-listener-options)
  - [once(eventName, listener, options?)](#onceeventname-listener-options)
  - [off(eventName, listener, options?)](#offeventname-listener-options)
  - [flush(eventName, listener?, options?)](#flusheventname-listener-options)
  - [pause({queueEmissions?, emissionInterval?, eventName?})](#pausequeueemissions-emissioninterval-eventname)
  - [resume(eventName?)](#resumeeventname)
  - [enableDebug({ emit?, on?, off?})](#enabledebug-emit-on-off)

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

bEmitter.pause(true);
// emissions after this, will be queued

console.log("emission queued");

bEmitter.emit("ping", "1");
bEmitter.emit("ping", "2");
bEmitter.emit("ping", "3");

bEmitter.resume();
// logs -> buffered data: ["1", "2"]

console.log("emission dequeued");

bEmitter.emit("ping", "4");
// logs -> buffered data: ["3", "4"]
```

**Demo**: https://stackblitz.com/edit/buffered-event-emitter-example-one

### Usage in Node

Using esm

```typescript
// index.mjs

import { BufferedEventEmitter } from "buffered-event-emitter";

const bEmitter = new BufferedEventEmitter();
```

Using CommonJs

```typescript
// index.js

const { BufferedEventEmitter } = require("buffered-event-emitter");

const bEmitter = new BufferedEventEmitter();
```

### Usage in Browser

Using esm with a bundler

```typescript
// index.js

import { BufferedEventEmitter } from "buffered-event-emitter";

const bEmitter = new BufferedEventEmitter();
```

Using via script tag

```html
<!-- index.html -->

<!-- For Dev Env -->
<script src="https://unpkg.com/buffered-event-emitter"></script>

<!-- For Production Env-->
<script src="https://unpkg.com/buffered-event-emitter/lib/bundle.umd.min.js"></script>
```

```typescript
// index.js
const bEmitter = new BufferedEventEmitter();
```

## API

### new BufferedEventEmitter(options?)

```typescript
const bEmitter = new BufferedEventEmitter();
```

Create a new instance of BufferedEventEmitter.

#### `options?` <!-- omit in toc -->

Type: `object`

```typescript
{
 buffered?: boolean;
 bufferCapacity?: number;
 logger?: Function;
}
```

Config options for instance of BufferedEventEmitter.

#### `buffered?` <!-- omit in toc -->

Type: `boolean`

Configure if event listeners registered on this instance will received buffered event data.

#### `bufferCapacity?` <!-- omit in toc -->

Type: `number`\
Default: `5`

Configure buffer capacity. Default capacity of 5 means event listener will receive event data every 5 emissions.

#### `logger` <!-- omit in toc -->

Type: `(type: "emit" | "on" | "off", eventName: string, eventData?: EventData | Listener) => void`  
Default: `logger` in utils https://github.com/33j33/buffered-event-emitter/blob/develop/src/utils.ts

Add a custom logger.

### emit(eventName, data?)

```typescript
emit(eventName: string, data?: EventData): boolean
```

Synchronously invokes each of the listeners registered for the event named `eventName` with `eventData` as argument, in the order they were registered.

Returns `true` if any listener was invoked, `false` otherwise.

#### Arguments <!-- omit in toc -->

| Argument  | Type      | Required | Description                                           |
| --------- | --------- | -------- | ----------------------------------------------------- |
| eventName | string    | Yes      | Identifier for the event to be emitted                |
| data      | EventData | No       | Argument to be passed to be listener when invoking it |

### on(eventName, listener, options?)

```typescript
on(eventName: string, listener: Listener,  options?: ListenerOptions): boolean
```

Adds an event listener for given `eventName` and `options`.
If the combination of `listener` and `options` is already present for the event, the `listener` is not added a second time.

Returns `true` if listener was added `false` otherwise.

#### Arguments <!-- omit in toc -->

| Argument  | Type            | Required | Description                                                                                                          |
| --------- | --------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| eventName | string          | Yes      | Identifier for the event to be emitted                                                                               |
| listener  | Listener        | Yes      | Callback that will be invoked each time event is emitted                                                             |
| options   | ListenerOptions | No       | Config options for listener, eg `{ buffered: true, bufferCapacity: 2 }` creates buffered listener with capacity of 2 |

### once(eventName, listener, options?)

```typescript
once(eventName: string, listener: Listener,  options?: ListenerOptions): boolean
```

Adds a one-time event `listener` for given `eventName` and `options`.
If the combination of `listener` and `options` is already present for the event, the listener is not added a second time.
The first time event is triggered, this listener is invoked and then removed.

Returns `true` if listener was added `false` otherwise.

#### Arguments <!-- omit in toc -->

| Argument  | Type            | Required | Description                                                                                                          |
| --------- | --------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| eventName | string          | Yes      | Identifier for the event to be emitted                                                                               |
| listener  | Listener        | Yes      | Callback that will be invoked each time event is emitted                                                             |
| options   | ListenerOptions | No       | Config options for listener, eg `{ buffered: true, bufferCapacity: 2 }` creates buffered listener with capacity of 2 |

### off(eventName, listener, options?)

```typescript
off(eventName: string, listener: Listener,  options?: ListenerOptions): boolean
```

Removes an event listener previously registered with `on()` or `addListener()`.
The event listener to be removed is identified using a combination of the `eventName`, the event `listener` function itself, and provided `options`.

Returns `true` if listener was removed `false` otherwise.

#### Arguments <!-- omit in toc -->

| Argument  | Type            | Required | Description                            |
| --------- | --------------- | -------- | -------------------------------------- |
| eventName | string          | Yes      | Identifier for the event to be emitted |
| listener  | Listener        | Yes      | Callback to be removed                 |
| options   | ListenerOptions | No       | Config options for listener            |

### flush(eventName, listener?, options?)

```typescript
flush(eventName: string): boolean;
flush(eventName: string, listener: Listener, options: ListenerOptions): boolean;
```

Flush all buffered events for listeners for given event name if only `eventName` is provided, else buffered events for given combination of `eventName`, `listener` and `options` are flushed.
Returns `true` if any events were flushed (emitted), `false` otherwise.

#### Arguments <!-- omit in toc -->

| Argument  | Type            | Required | Description                                                 |
| --------- | --------------- | -------- | ----------------------------------------------------------- |
| eventName | string          | Yes      | Identifier for the event to be emitted                      |
| listener  | Listener        | No       | Callback which was registered earlier                       |
| options   | ListenerOptions | No       | Config options which were passed while registering callback |

### pause({queueEmissions?, emissionInterval?, eventName?})

```typescript
pause({queueEmissions?: boolean = true, emissionInterval?: number = 0, eventName?: string}): void
```

Pause event emissions for all or given event. Any subsequent event emissions will be swallowed or queued and
their respective listeners will not be invoked until `resume()` is called. If event name is provided, only the particular event is paused.

| Argument         | Type    | Required | Description                                                                                                                     |
| ---------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| queueEmissions   | boolean | No       | if true, subsequent event emissions will be queued else swallowed and the corresponding listeners not invoked.                  |
| emissionInterval | number  | No       | interval for dequeueing queued events. if interval is 0, the events are dequeued synchronously else asynchronously but in order |
| eventName        | string  | No       | name for the event to be paused                                                                                                 |

### resume(eventName?)

```typescript
resume(eventName?: string): Promise<void> | void
```

Resumes event emission for all events or provided event.
Emits event asynchronously and returns a Promise if value of emission interval was greater than 0 when event emission was paused using `pause()` or else emits event synchronously. If eventName is provided resumes event emission for that particular event only.

### enableDebug({ emit?, on?, off?})

```typescript
static enableDebug({ emit?: boolean; on?: boolean; off?: boolean })
```

Enables debugging for all instances of the event emitter through the `logger` function.  
Depending on what actions are `true` in opts, logging is enabled for that action.  
Eg, `{ emit: true}` enables debuggin for all `emit` actions.

Example:

```typescript
const bEmitter = new BufferedEventEmitter();
BufferedEventEmitter.enableDebug({ emit: true, on: true, off: true });

function ping(data: string) {
  // ...
}

bEmitter.on("ping", ping);
bEmitter.emit("ping", "first emit");
bEmitter.emit("ping", "second emit");
bEmitter.off("ping", ping);
bEmitter.emit("ping", "third emit");

// Logged data
/**
[Event Type: on | Event Name: ping | 22:23:23.801]
    [Event Data: function ping(data) {    // ...}}]

[Event Type: emit | Event Name: ping | 22:23:23.802]
     [Event Data: "first emit"}]

[Event Type: emit | Event Name: ping | 22:23:23.803]
     [Event Data: "second emit"}]

[Event Type: off | Event Name: ping | 22:23:23.803]
     [Event Data: function ping(data) {    // ...}}]
*/
```
