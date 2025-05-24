// @ts-ignore
// import { BufferedEventEmitter } from "@buffered-event-emitter"; // test different builds using moduleMapper
// import { BufferedEventEmitter } from "../src";

// reset Module before each test
let BufferedEventEmitter: typeof import("../src").BufferedEventEmitter;
let EventController: typeof import("../src").EventController;
beforeEach(async () => {
  EventController = (await import("../src")).EventController;
  BufferedEventEmitter = (await import("../src")).BufferedEventEmitter;
  jest.resetModules();
});

describe("#init", function () {
  it("should initialise BufferedEventEmitter with given options", function () {
    const logger = () => { };
    const options = { buffered: true, bufferCapacity: 3, logger, cache: true, cacheCapacity: 10 };
    const emitter = new BufferedEventEmitter(options);
    // @ts-ignore
    expect(emitter._opts).toStrictEqual({...options, bufferInactivityTimeout: 0});
  });
});

describe("fn#enableDebug()", function () {
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
    const noop = () => { };
    emitterOne.on("foo", noop);
    emitterOne.emit("foo");
    emitterTwo.on("bar", noop);
    emitterTwo.emit("bar");
    emitterTwo.off("bar", noop);
    emitterOne.emit("bar");
    expect(logs).toStrictEqual(["on-foo", "emit-foo", "on-bar", "emit-bar", "off-bar"]);
  });
});

describe("fn#emit()", function () {
  it("should return true when event is emitted and false when there are no events to emit", function () {
    const emitter = new BufferedEventEmitter();
    const listener = () => { };
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

describe("fn#on()", function () {
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

  describe('should add buffered listener with inactivity timeout', () => {

    // Use fake timers before each test in this describe block
    beforeEach(() => {
      jest.useFakeTimers();
    });

    // Restore real timers after each test in this describe block
    afterEach(() => {
      jest.useRealTimers();
    });

    it("of 1sec and flush correctly", async function () {
      const emitter = new BufferedEventEmitter();
      const listener = jest.fn();
      // register listener with timeout of 1sec
      emitter.on("bar", listener, { buffered: true, bufferCapacity: 10, bufferInactivityTimeout: 1000 });

      // buffer is [2], timeout starts
      emitter.emit("bar", 2);
      // Listener should not have been called yet because bufferCapacity is 10
      expect(listener).not.toHaveBeenCalled();

      // buffer is [2, 10]. The previous timeout is cleared and a new one is scheduled.
      emitter.emit("bar", 10);
      // Listener should still not have been called
      expect(listener).not.toHaveBeenCalled();

      // Advance time by less than the inactivity timeout (e.g., 500ms)
      jest.advanceTimersByTime(500);
      // Timeout should not have fired yet
      expect(listener).not.toHaveBeenCalled();

      // Advance time by the remaining duration for the inactivity timeout to fire.
      jest.advanceTimersByTime(500);
      // The inactivity timeout should now fire and flush the bucket [2, 10]
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith([2, 10]); // Listener receives the bucket as an array
      // After flush, the bucket is cleared, and no new timeout is pending from this flush action itself

      // Clear the mock call history for the next part of the test
      listener.mockClear();

      jest.advanceTimersByTime(1000); // Advance timers to the 2000ms mark from test start

      // buffer is [20], A new timeout is scheduled
      emitter.emit("bar", 20);
      expect(listener).not.toHaveBeenCalled();

      // Advance time by less than the inactivity timeout
      jest.advanceTimersByTime(500);
      expect(listener).not.toHaveBeenCalled();

      // Advance time by the remaining duration
      jest.advanceTimersByTime(500); // Total time advanced since emit(20) is 1000ms
      // The second inactivity timeout should now fire and flush the bucket [20]
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith([20]); // Listener receives the bucket [20]

      // advance more time to ensure no unexpected timers fire
      jest.advanceTimersByTime(5000);
      expect(listener).toHaveBeenCalledTimes(1); // No more calls expected
    });
  });
});

describe("fn#once()", function () {
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

describe("fn#off()", function () {
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

describe("fn#flush()", function () {
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

describe("fn#pause()", function () {
  it("should swallow event emission when emissions are not to be queued", function () {
    const emitter = new BufferedEventEmitter();
    const calls: number[] = [];
    const listener = (arg: number) => {
      calls.push(arg);
    };
    emitter.on("bar", listener);
    emitter.on("foo", listener);
    emitter.emit("bar", 1);
    emitter.emit("foo", 1);
    emitter.pause({ queueEmissions: false });
    expect(emitter.emit("foo", 2)).toBe(false);
    expect(emitter.emit("bar", 2)).toBe(false);
    emitter.resume();
    expect(calls).toStrictEqual([1, 1]);
  });

  it("should pause events and queue event emissions", function () {
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
    emitter.pause();
    calls = [];
    expect(emitter.emit("bar", 2)).toBe(false);
    emitter.emit("bar", 3);
    emitter.emit("bar", 4);
    emitter.resume();
    expect(calls).toStrictEqual([2, 3, 4]);
  });

  it("should pause given event only and queue its emissions", function () {
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
    emitter.pause({ eventName: "bar" });
    calls = [];
    expect(emitter.emit("foo", 2)).toBe(true);
    expect(emitter.emit("bar", 3)).toBe(false);
    expect(emitter.emit("bar", 4)).toBe(false);
    expect(emitter.emit("bar", 5)).toBe(false);
    emitter.resume("bar");
    expect(calls).toStrictEqual([2, 3, 4, 5]);
  });
});

describe("fn#resume()", function () {
  it("should resume all events and dequeue event emissions synchronously", function () {
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
    emitter.pause();
    calls = [];
    expect(emitter.emit("bar", "bar-1")).toBe(false);
    emitter.emit("bar", "bar-2");
    emitter.emit("bar", "bar-3");
    emitter.emit("foo", "foo-4");
    emitter.resume();
    expect(calls).toStrictEqual(["bar-1", "bar-2", "bar-3", ["foo-3", "foo-4"]]);
  });

  it("should resume all events and dequeue event emissions asynchronously", async function () {
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
    emitter.pause({ emissionInterval: timeInterval });
    calls = [];
    expect(emitter.emit("bar", "bar-1")).toBe(false);
    emitter.emit("bar", "bar-2");
    emitter.emit("bar", "bar-3");
    emitter.emit("foo", "foo-4");
    await emitter.resume();
    expect(calls).toStrictEqual(["bar-1", "bar-2", "bar-3", ["foo-3", "foo-4"]]);
  });

  it("should resume given event and dequeue its emissions asynchronously", async function () {
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
    emitter.on("foo", listener);
    emitter.emit("bar", "bar-1");
    emitter.emit("foo", "foo-1");
    emitter.pause({ emissionInterval: timeInterval, eventName: "bar" });
    expect(calls).toStrictEqual(["bar-1", "foo-1"]);
    calls = [];
    expect(emitter.emit("bar", "bar-2")).toBe(false);
    emitter.emit("bar", "bar-3");
    emitter.emit("bar", "bar-4");
    expect(emitter.emit("foo", "foo-2")).toBe(true);
    await emitter.resume("bar");
    expect(calls).toStrictEqual(["foo-2", "bar-2", "bar-3", "bar-4"]);
  });
});

describe("fn#getCache()", function () {
  it("should get stored event data in cache", function () {
    const emitter = new BufferedEventEmitter({ cache: true });
    const callsFoo: Array<string | string[]> = [];
    const callsBar: Array<string | string[]> = [];
    const listenerOne = (arg: string | string[]) => {
      expect(callsFoo.at(-1)).toStrictEqual(emitter.getCache("foo").at(-1));
      callsFoo.push(arg);
    };
    const listenerTwo = (arg: string | string[]) => {
      expect(callsBar.at(-1)).toStrictEqual(emitter.getCache("bar").at(-1));
      callsBar.push(arg);
    };
    emitter.on("foo", listenerOne);
    emitter.on("bar", listenerTwo, { buffered: true, bufferCapacity: 3 });
    emitter.emit("foo", "f-1");
    emitter.emit("bar", "b-1");
    emitter.emit("foo", "f-2");
    emitter.emit("bar", "b-2");
    emitter.emit("bar", "b-3");
    emitter.emit("bar", "b-4");
    emitter.flush("bar");
    expect(emitter.getCache("foo")).toStrictEqual(["f-1", "f-2"]);
    expect(emitter.getCache("bar")).toStrictEqual([["b-1", "b-2", "b-3"], ["b-4"]]);
  });
});

describe("fn#control.off()", function () {
  it("should remove all listeners that have been given `control` param in options", function () {
    const emitter = new BufferedEventEmitter();
    let count = 0;
    const listener = (arg: number) => {
      count += arg;
    };
    const control = new EventController();
    emitter.on("foo", listener, { control });
    emitter.on("bar", listener, { control });
    emitter.on("baz", listener, { control });
    emitter.on("abc", listener);
    expect(emitter.off("foo", listener)).toBe(false);
    control.off();
    expect(emitter.emit("foo", 1)).toBe(false);
    expect(emitter.emit("bar", 1)).toBe(false);
    expect(emitter.emit("baz", 1)).toBe(false);
    expect(emitter.listeners("foo").length).toBe(0);
    expect(emitter.listeners("abc").length).toBe(1);
    expect(count).toBe(0);
  });
});

describe("fn#control.flush()", function () {
  it("should flush all listeners that have been given `control` param in options", function () {
    const emitter = new BufferedEventEmitter();
    const control = new EventController();
    const calls: number[][] = [];
    const listenerOne = (arr: number[]) => {
      calls.push(arr);
    };
    const listenerTwo = (arr: number[]) => {
      calls.push(arr);
    };
    emitter.on("bar", listenerOne, { buffered: true, bufferCapacity: 4, control });
    emitter.on("bar", listenerOne, { buffered: true, bufferCapacity: 5, control });
    emitter.on("foo", listenerOne, { buffered: true, bufferCapacity: 6, control });
    emitter.on("taz", listenerTwo, { buffered: true, bufferCapacity: 2, control });
    emitter.emit("bar", 1);
    emitter.emit("bar", 2);
    emitter.emit("bar", 3);
    emitter.emit("foo", 1);
    emitter.emit("foo", 2);
    emitter.emit("taz", 1);
    control.flush();
    expect(calls).toStrictEqual([[1, 2, 3], [1, 2, 3], [1, 2], [1]]);
  });
});
