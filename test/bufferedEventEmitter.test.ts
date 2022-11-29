// @ts-ignore
// import { BufferedEventEmitter } from "@buffered-event-emitter"; // test different builds using moduleMapper
// import { BufferedEventEmitter } from "../src";

// reset Module before each test
let BufferedEventEmitter: typeof import("../src").BufferedEventEmitter;
beforeEach(async () => {
  BufferedEventEmitter = (await import("../src")).BufferedEventEmitter;
  jest.resetModules();
});

describe("#init", function () {
  it("should initialise BufferedEventEmitter with given options", function () {
    const logger = (type: "emit" | "on" | "off", name: string, data?: any) => {};
    const options = { buffered: true, bufferCapacity: 3, logger };
    const emitter = new BufferedEventEmitter(options);
    // @ts-ignore
    expect(emitter._options).toStrictEqual(options);
  });
});

describe("fn#enableDebug", function () {
  it("should enable logging for all instances of Emitter", function () {
    const logs: string[] = [];
    const logger = (type: "emit" | "on" | "off", eventname: string, eventdata?: any) => {
      logs.push(`${type}-${eventname}`);
    };
    const emitterOne = new BufferedEventEmitter({ logger });
    const emitterTwo = new BufferedEventEmitter({ logger });
    const debugOpts = { emit: true, on: true, off: true };
    BufferedEventEmitter.enableDebug(debugOpts);
    expect(BufferedEventEmitter.debugStatus).toStrictEqual(debugOpts);
    const noop = () => {};
    emitterOne.on("foo", noop);
    emitterOne.emit("foo");
    emitterTwo.on("bar", noop);
    emitterTwo.emit("bar");
    emitterTwo.off("bar", noop);
    emitterOne.emit("bar");
    expect(logs).toStrictEqual(["on-foo", "emit-foo", "on-bar", "emit-bar", "off-bar"]);
  });
});

describe("fn#emit", function () {
  it("should return true when event is emitted and false when there are no events to emit", function () {
    const emitter = new BufferedEventEmitter();
    const listener = () => {};
    emitter.on("bar", listener);
    expect(emitter.emit("foo")).toBe(false);
    expect(emitter.emit("bar")).toBe(true);
  });

  it("should emit with data", function () {
    const emitter = new BufferedEventEmitter();
    const colors = ["red", "green", "blue"];
    const listener = (data: string[]) => {
      expect(data).toBe(colors);
    };
    emitter.on("get-colors", listener);
    emitter.emit("get-colors", colors);
  });

  it("should emit to all listeners", function () {
    const emitter = new BufferedEventEmitter();
    const calls: number[] = [];
    const listenerOne = () => {
      calls.push(0);
    };
    const listenerTwo = () => {
      calls.push(1);
    };
    const listenerThree = () => {
      calls.push(2);
    };
    emitter.on("bar", listenerOne);
    emitter.on("bar", listenerTwo);
    emitter.on("bar", listenerThree);

    emitter.emit("bar");
    expect(calls).toStrictEqual([0, 1, 2]);
  });
});

describe("fn#on", function () {
  it("should subscribe to event name provided", function () {
    const emitter = new BufferedEventEmitter();
    let count = 0;
    const listener = () => {
      count += 1;
    };
    expect(emitter.on("bar", listener)).toBe(true);
    emitter.emit("bar");
    emitter.emit("bar");
    emitter.emit("foo");

    expect(count).toBe(2);
  });

  it("should dedupe listeners", function () {
    // If the combination of event name, listener and options is already present, the listener is not added a second time
    const emitter = new BufferedEventEmitter();
    let count = 0;
    const listener = () => {
      count += 1;
    };
    expect(emitter.on("bar", listener)).toBe(true);
    expect(emitter.on("bar", listener)).toBe(false);

    expect(emitter.on("foo", listener, { buffered: true, bufferCapacity: 3 })).toBe(true);

    expect(emitter.on("foo", listener, { buffered: true, bufferCapacity: 3 })).toBe(false);

    emitter.emit("bar");
    emitter.emit("foo");
    expect(count).toBe(1);
    expect(emitter.listeners("bar").length).toBe(1);
    expect(emitter.listeners("foo").length).toBe(1);
  });

  it("should add buffered listener", function () {
    const emitter = new BufferedEventEmitter();
    const calls: number[][] = [];
    const listener = (arr: number[]) => {
      calls.push(arr);
    };
    emitter.on("bar", listener, { buffered: true, bufferCapacity: 2 });
    emitter.emit("bar", 1);
    expect(emitter.emit("bar", 2)).toBe(true);
    emitter.emit("bar", 3);
    emitter.emit("bar", 4);
    expect(emitter.emit("bar", 5)).toBe(false);
    expect(emitter.flush("bar")).toBe(true);
    expect(calls).toStrictEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("fn#once", function () {
  it("should add a one-time listener for given event name", function () {
    const emitter = new BufferedEventEmitter();
    let count = 0;
    function listener(arg: number) {
      count += arg;
    }
    expect(emitter.once("ping", listener)).toBe(true);

    emitter.emit("ping", 10);
    expect(emitter.emit("ping", 10)).toBe(false);

    expect(count).toBe(10);
    expect(emitter.listeners("ping").length).toBe(0);
  });

  it("should add a one-time buffered listener for given event name", function () {
    const emitter = new BufferedEventEmitter();
    const calls: number[][] = [];
    const listener = (arr: number[]) => {
      calls.push(arr);
    };
    emitter.once("bar", listener, { buffered: true, bufferCapacity: 2 });
    emitter.emit("bar", 1);
    emitter.emit("bar", 2);
    emitter.emit("bar", 3);
    emitter.flush("bar");

    expect(calls).toStrictEqual([[1, 2]]);
  });

  it("should dedupe listeners", function () {
    const emitter = new BufferedEventEmitter();
    let count = 0;
    const listener = (arg: number) => {
      count += arg;
    };
    expect(emitter.once("bar", listener)).toBe(true);
    expect(emitter.on("bar", listener)).toBe(false);
    expect(emitter.once("bar", listener)).toBe(false);

    emitter.emit("bar", 10);
    expect(emitter.listeners("bar").length).toBe(0);
    expect(emitter.emit("bar", 10)).toBe(false);
    expect(count).toBe(10);
  });
});

describe("fn#off", function () {
  it("should remove listener, identified with given event name, listener and options", function () {
    const emitter = new BufferedEventEmitter();
    let count = 0;
    const listener = (arg: number) => {
      count += arg;
    };
    expect(emitter.on("bar", listener)).toBe(true);
    emitter.on("bar", listener, { buffered: true });

    expect(emitter.off("bar", listener)).toBe(true); // removes the 1st listener
    emitter.emit("bar", 10);
    expect(count).toBe(0);
    expect(emitter.listeners("bar").length).toBe(1);
    expect(emitter.off("bar", listener, { buffered: true })).toBe(true); // removes the 2nd listener with options
    expect(emitter.listeners("bar").length).toBe(0);
    expect(emitter.off("bar", listener)).toBe(false);
  });
});

describe("fn#flush", function () {
  it("should flush buffered events for listener identified by event name, listener and options", function () {
    const emitter = new BufferedEventEmitter();
    const calls: number[][] = [];
    const listener = (arr: number[]) => {
      calls.push(arr);
    };
    emitter.on("bar", listener, { buffered: true, bufferCapacity: 3 });
    emitter.on("bar", listener, { buffered: true, bufferCapacity: 2 });

    expect(emitter.emit("bar", 1)).toBe(false);
    expect(emitter.emit("bar", 2)).toBe(true);
    expect(emitter.emit("bar", 3)).toBe(true);

    expect(emitter.flush("bar", listener, { buffered: true, bufferCapacity: 2 })).toBe(true);

    expect(calls).toStrictEqual([[1, 2], [1, 2, 3], [3]]);
  });
  it("should flush buffered events for all listeners when only event name is provided", function () {
    const emitter = new BufferedEventEmitter();
    const calls: number[][] = [];
    const listener = (arr: number[]) => {
      calls.push(arr);
    };
    emitter.on("bar", listener, { buffered: true, bufferCapacity: 6 });
    emitter.on("bar", listener, { buffered: true, bufferCapacity: 7 });
    emitter.on("foo", listener, { buffered: true, bufferCapacity: 8 });
    emitter.emit("bar", 1);
    emitter.emit("bar", 2);
    emitter.emit("bar", 3);
    emitter.emit("foo", 1);
    emitter.emit("foo", 2);
    emitter.flush("bar");
    emitter.flush("foo");
    expect(calls).toStrictEqual([
      [1, 2, 3],
      [1, 2, 3],
      [1, 2],
    ]);
  });
});

describe("fn#pause", function () {
  it("should swallow events when emissions are not to be queued", function () {
    const emitter = new BufferedEventEmitter();
    const calls: number[] = [];
    const listener = (arg: number) => {
      calls.push(arg);
    };
    emitter.on("bar", listener);
    emitter.on("foo", listener);
    emitter.emit("bar", 1);
    emitter.emit("foo", 1);
    emitter.pause();
    expect(emitter.emit("foo", 2)).toBe(false);
    expect(emitter.emit("bar", 2)).toBe(false);
    expect(calls).toStrictEqual([1, 1]);
  });

  it("should queue events", function () {
    const emitter = new BufferedEventEmitter();
    let calls: number[] = [];
    const listener = (arg: number) => {
      calls.push(arg);
    };
    emitter.on("bar", listener);
    emitter.on("foo", listener);
    emitter.emit("bar", 1);
    emitter.emit("foo", 1);
    expect(calls).toStrictEqual([1, 1]);
    emitter.pause(true);
    calls = [];
    expect(emitter.emit("bar", 2)).toBe(false);
    emitter.emit("bar", 3);
    emitter.emit("bar", 4);
    emitter.resume();
    expect(calls).toStrictEqual([2, 3, 4]);
  });
});

describe("fn#resume", function () {
  it("should resume and dequeue event synchronously", function () {
    const emitter = new BufferedEventEmitter();
    let calls: string[] = [];
    const listener = (arg: string) => {
      calls.push(arg);
    };
    emitter.on("bar", listener);
    emitter.on("foo", listener, { buffered: true, bufferCapacity: 2 });
    emitter.emit("foo", "foo-1");
    emitter.emit("foo", "foo-2");
    emitter.emit("foo", "foo-3");
    expect(calls).toStrictEqual([["foo-1", "foo-2"]]);
    emitter.pause(true);
    calls = [];
    expect(emitter.emit("bar", "bar-1")).toBe(false);
    emitter.emit("bar", "bar-2");
    emitter.emit("bar", "bar-3");
    emitter.emit("foo", "foo-4");
    emitter.resume();
    expect(calls).toStrictEqual(["bar-1", "bar-2", "bar-3", ["foo-3", "foo-4"]]);
  });

  it("should resume and dequeue event asynchronously", async function () {
    const emitter = new BufferedEventEmitter();
    let calls: string[] = [];
    let prevDequeuedTime: number = 0;
    const timeInterval = 100;
    const listener = (arg: string) => {
      if (prevDequeuedTime !== 0) {
        const currentTime = performance.now();
        const diff = currentTime - prevDequeuedTime;
        expect(diff).toBeCloseTo(timeInterval);
      }
      calls.push(arg);
    };
    emitter.on("bar", listener);
    emitter.on("foo", listener, { buffered: true, bufferCapacity: 2 });
    emitter.emit("foo", "foo-1");
    emitter.emit("foo", "foo-2");
    emitter.emit("foo", "foo-3");
    expect(calls).toStrictEqual([["foo-1", "foo-2"]]);
    emitter.pause(true, timeInterval);
    calls = [];
    expect(emitter.emit("bar", "bar-1")).toBe(false);
    emitter.emit("bar", "bar-2");
    emitter.emit("bar", "bar-3");
    emitter.emit("foo", "foo-4");
    await emitter.resume();
    expect(calls).toStrictEqual(["bar-1", "bar-2", "bar-3", ["foo-3", "foo-4"]]);
  });
});
