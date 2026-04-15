import {
  clearHandoff,
  onResult,
  readHandoff,
  writeHandoff,
} from "../../../../../../src/features/admin/jsonforms-studio/util/handoff";

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
      expect(typeof raw).toBe("string");
      const parsed = JSON.parse(raw as string);
      expect(parsed).toHaveProperty("schema");
      expect(parsed).toHaveProperty("uiSchema");
      expect(parsed.readonly).toBe(false);
    });

    it("should return a UUID-shaped id", () => {
      const id = writeHandoff(samplePayload());
      expect(id).toMatch(/[0-9a-f-]{8,}/i);
    });
  });

  describe("readHandoff", () => {
    it("should read and return the stored payload for a given id", () => {
      const id = writeHandoff(samplePayload());
      const out = readHandoff(id);
      expect(out).not.toBeNull();
      expect(out?.readonly).toBe(false);
    });

    it("should be idempotent (StrictMode-safe) and only clear via clearHandoff", () => {
      const id = writeHandoff(samplePayload());
      const first = readHandoff(id);
      const second = readHandoff(id);
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      clearHandoff(id);
      expect(readHandoff(id)).toBeNull();
    });

    it("should return null when no entry exists for the id", () => {
      expect(readHandoff("nonexistent")).toBeNull();
    });
  });

  describe("onResult", () => {
    it("should ignore messages from a different origin", async () => {
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
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(called).toBe(false);
    });

    it("should ignore messages with a mismatched id", async () => {
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
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(called).toBe(false);
    });

    it("should invoke the callback exactly once and then detach the listener", async () => {
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
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(count).toBe(1);
      expect(received).toEqual({
        schema: { a: 1 },
        uiSchema: { b: 2 },
      });
    });
  });
});
