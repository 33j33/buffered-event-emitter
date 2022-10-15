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
});
