import { BufferedEventEmitter } from "../src";

describe("BEmitter#emit", function () {
  it("should return true when event is emitted and false when there are not events to emit", function () {
    const emitter = new BufferedEventEmitter();
    const listener = () => {
      console.log("bar emitted");
    };
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
    expect(calls).toEqual([0, 1, 2]);
  });
});

describe("BEmitter#on", function () {
  it("should subscribe to event name provided", function () {
    const emitter = new BufferedEventEmitter();
    let count = 0;
    const listener = () => {
      count += 1;
    };
    emitter.on("bar", listener);
    emitter.emit("bar");
    emitter.emit("bar");
    emitter.emit("foo");
    expect(count).toBe(2);
  });

  it("should dedupe listeners. If the combination of event name, listener and options is already present, the listener is not added a second time", function () {
    const emitter = new BufferedEventEmitter();
    let count = 0;
    const listener = () => {
      count += 1;
    };
    emitter.on("bar", listener);
    emitter.on("bar", listener);
    emitter.on("foo", listener);
    emitter.on("foo", listener);
    emitter.on("foo", listener);
    emitter.emit("bar");

    expect(count).toBe(1);
    expect(emitter.listeners("bar").length).toBe(1);
    expect(emitter.listeners("foo").length).toBe(1);
  });
});
