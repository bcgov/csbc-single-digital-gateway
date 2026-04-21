import {
  emptyHistory,
  HISTORY_LIMIT,
  pushHistory,
  redoHistory,
  type Snapshot,
  undoHistory,
} from "../../../../../../src/features/admin/jsonforms-studio/state/history";
import type { SchemaDoc, UiSchemaDoc } from "../../../../../../src/features/admin/jsonforms-studio/model/types";

const snap = (id: number): Snapshot => ({
  schema: { type: "object", properties: { [`p${id}`]: { type: "string" } } } as SchemaDoc,
  uiSchema: { type: "VerticalLayout", elements: [] } as unknown as UiSchemaDoc,
});

describe("jsonforms-studio / history", () => {
  describe("push", () => {
    it("should append a snapshot to the past stack", () => {
      const h = pushHistory(emptyHistory(), snap(1));
      expect(h.past).toHaveLength(1);
    });

    it("should clear the future stack when a new snapshot is pushed", () => {
      let h = pushHistory(emptyHistory(), snap(1));
      const undone = undoHistory(h, snap(2));
      expect(undone).not.toBeNull();
      h = pushHistory(undone!.history, snap(3));
      expect(h.future).toHaveLength(0);
    });

    it("should cap the past stack at 100 entries and drop the oldest", () => {
      let h = emptyHistory();
      for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
        h = pushHistory(h, snap(i));
      }
      expect(h.past.length).toBe(HISTORY_LIMIT);
      expect((h.past[0].schema.properties as Record<string, unknown>)).toHaveProperty("p5");
    });
  });

  describe("undo", () => {
    it("should return the previous snapshot and move current onto future", () => {
      const h = pushHistory(emptyHistory(), snap(1));
      const result = undoHistory(h, snap(2));
      expect(result).not.toBeNull();
      expect(result!.history.past).toHaveLength(0);
      expect(result!.history.future).toHaveLength(1);
      expect((result!.snapshot.schema.properties as Record<string, unknown>)).toHaveProperty("p1");
    });

    it("should return null when the past stack is empty", () => {
      expect(undoHistory(emptyHistory(), snap(1))).toBeNull();
    });
  });

  describe("redo", () => {
    it("should return the next snapshot and push current back onto past", () => {
      const h = pushHistory(emptyHistory(), snap(1));
      const undone = undoHistory(h, snap(2))!;
      const redone = redoHistory(undone.history, undone.snapshot);
      expect(redone).not.toBeNull();
      expect(redone!.history.past).toHaveLength(1);
      expect(redone!.history.future).toHaveLength(0);
      expect((redone!.snapshot.schema.properties as Record<string, unknown>)).toHaveProperty("p2");
    });

    it("should return null when the future stack is empty", () => {
      expect(redoHistory(emptyHistory(), snap(1))).toBeNull();
    });
  });
});
