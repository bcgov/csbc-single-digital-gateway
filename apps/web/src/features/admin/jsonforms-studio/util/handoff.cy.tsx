import {
  clearHandoff,
  onResult,
  readHandoff,
  writeHandoff,
} from "./handoff";

const samplePayload = () => ({
  schema: { type: "object", properties: {} },
  uiSchema: { type: "VerticalLayout", elements: [] },
  readonly: false,
});

describe("jsonforms-studio / handoff", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  describe("writeHandoff", () => {
    it("should write { schema, uiSchema, readonly } under the generated id", () => {
      const id = writeHandoff(samplePayload());
      const raw = window.sessionStorage.getItem(`studio:handoff:${id}`);
      expect(raw).to.be.a("string");
      const parsed = JSON.parse(raw as string);
      expect(parsed).to.have.property("schema");
      expect(parsed).to.have.property("uiSchema");
      expect(parsed.readonly).to.equal(false);
    });

    it("should return a UUID-shaped id", () => {
      const id = writeHandoff(samplePayload());
      expect(id).to.match(/[0-9a-f-]{8,}/i);
    });
  });

  describe("readHandoff", () => {
    it("should read and return the stored payload for a given id", () => {
      const id = writeHandoff(samplePayload());
      const out = readHandoff(id);
      expect(out).to.not.equal(null);
      expect(out?.readonly).to.equal(false);
    });

    it("should be idempotent (StrictMode-safe) and only clear via clearHandoff", () => {
      const id = writeHandoff(samplePayload());
      const first = readHandoff(id);
      const second = readHandoff(id);
      expect(first).to.not.equal(null);
      expect(second).to.not.equal(null);
      clearHandoff(id);
      expect(readHandoff(id)).to.equal(null);
    });

    it("should return null when no entry exists for the id", () => {
      expect(readHandoff("nonexistent")).to.equal(null);
    });
  });

  describe("onResult", () => {
    it("should ignore messages from a different origin", (done) => {
      let called = false;
      onResult("abc", () => {
        called = true;
      });
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "studio:apply",
            id: "abc",
            result: { schema: {}, uiSchema: {} },
          },
          origin: "https://evil.example",
        }),
      );
      setTimeout(() => {
        expect(called).to.equal(false);
        done();
      }, 50);
    });

    it("should ignore messages with a mismatched id", (done) => {
      let called = false;
      onResult("abc", () => {
        called = true;
      });
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "studio:apply",
            id: "other",
            result: { schema: {}, uiSchema: {} },
          },
          origin: window.location.origin,
        }),
      );
      setTimeout(() => {
        expect(called).to.equal(false);
        done();
      }, 50);
    });

    it("should invoke the callback exactly once and then detach the listener", (done) => {
      let count = 0;
      let received: { schema: unknown; uiSchema: unknown } | null = null;
      onResult("abc", (result) => {
        count++;
        received = result;
      });
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "studio:apply",
            id: "abc",
            result: { schema: { a: 1 }, uiSchema: { b: 2 } },
          },
          origin: window.location.origin,
        }),
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "studio:apply",
            id: "abc",
            result: { schema: {}, uiSchema: {} },
          },
          origin: window.location.origin,
        }),
      );
      setTimeout(() => {
        expect(count).to.equal(1);
        expect(received).to.deep.equal({
          schema: { a: 1 },
          uiSchema: { b: 2 },
        });
        done();
      }, 50);
    });
  });
});
