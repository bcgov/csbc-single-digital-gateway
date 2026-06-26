import { describe, expect, it } from 'vitest';
import {
  addPage,
  addStage,
  addStageAfter,
  addStageBefore,
  connect,
  disconnect,
  emptyDefinition,
  hasIncoming,
  hasOutgoing,
  removePage,
  removeStage,
  renamePage,
  renameStage,
  reorderPages,
  setStagePosition,
  updatePageDefinition,
  type MultiStageDefinition,
} from '@/components/stage-builder/stage-model';

const firstStage = (d: MultiStageDefinition) => d.stages[0]!;

describe('stage-model', () => {
  it('emptyDefinition has one stage with one page', () => {
    const d = emptyDefinition();
    expect(d.stages).toHaveLength(1);
    expect(firstStage(d).pages).toHaveLength(1);
    expect(d.edges).toEqual([]);
  });

  describe('stages', () => {
    it('addStage appends a stage (with its own page) at a fresh position', () => {
      const d = emptyDefinition();
      const next = addStage(d);
      expect(next.stages).toHaveLength(2);
      expect(next.stages[1]!.pages.length).toBeGreaterThanOrEqual(1);
      expect(next.stages[1]!.position).not.toEqual(firstStage(d).position);
    });

    it('removeStage removes a stage but refuses the last one', () => {
      const two = addStage(emptyDefinition());
      const id = two.stages[0]!.id;
      const after = removeStage(two, id);
      expect(after.stages.map((s) => s.id)).not.toContain(id);
      const last = removeStage(after, after.stages[0]!.id);
      expect(last.stages).toHaveLength(1); // refused
    });

    it('removeStage bridges incoming → outgoing when a middle stage is deleted', () => {
      // Build a chain A → X → B, then delete X.
      let d = emptyDefinition();
      const a = firstStage(d).id;
      d = addStageAfter(d, a); // A → X
      const x = d.stages[1]!.id;
      d = addStageAfter(d, x); // X → B
      const b = d.stages[2]!.id;
      const healed = removeStage(d, x);
      expect(healed.stages.map((s) => s.id)).toEqual([a, b]);
      expect(healed.edges).toHaveLength(1);
      expect(healed.edges[0]).toMatchObject({ source: a, target: b });
    });

    it('removeStage drops edges touching the removed stage', () => {
      const two = addStage(emptyDefinition());
      const [a, b] = [two.stages[0]!.id, two.stages[1]!.id];
      const linked = connect(two, a, b);
      expect(linked.edges).toHaveLength(1);
      const after = removeStage(linked, b);
      expect(after.edges).toHaveLength(0);
    });

    it('renameStage + setStagePosition update the stage', () => {
      const d = emptyDefinition();
      const id = firstStage(d).id;
      expect(firstStage(renameStage(d, id, 'Intake')).name).toBe('Intake');
      expect(firstStage(setStagePosition(d, id, { x: 10, y: 20 })).position).toEqual({
        x: 10,
        y: 20,
      });
    });
  });

  describe('pages', () => {
    it('addPage appends a page to the stage', () => {
      const d = emptyDefinition();
      const id = firstStage(d).id;
      expect(firstStage(addPage(d, id)).pages).toHaveLength(2);
    });

    it('removePage removes a page but refuses the last in a stage', () => {
      const base = emptyDefinition();
      const stageId = base.stages[0]!.id;
      const d = addPage(base, stageId);
      const pageId = d.stages[0]!.pages[0]!.id;
      const after = removePage(d, stageId, pageId);
      expect(after.stages[0]!.pages.map((p) => p.id)).not.toContain(pageId);
      const last = removePage(after, stageId, after.stages[0]!.pages[0]!.id);
      expect(last.stages[0]!.pages).toHaveLength(1); // refused
    });

    it('reorderPages moves a page within its stage', () => {
      let d = emptyDefinition();
      const stageId = d.stages[0]!.id;
      d = addPage(d, stageId);
      d = renamePage(d, stageId, d.stages[0]!.pages[0]!.id, 'A');
      d = renamePage(d, stageId, d.stages[0]!.pages[1]!.id, 'B');
      const moved = reorderPages(d, stageId, 0, 1);
      expect(moved.stages[0]!.pages.map((p) => p.name)).toEqual(['B', 'A']);
    });

    it('updatePageDefinition writes the page schema/uischema', () => {
      const d = emptyDefinition();
      const stageId = d.stages[0]!.id;
      const pageId = d.stages[0]!.pages[0]!.id;
      const def = { schema: { type: 'object', title: 'X' }, uischema: { type: 'VerticalLayout' } };
      const next = updatePageDefinition(d, stageId, pageId, def);
      expect(next.stages[0]!.pages[0]!.schema).toEqual(def.schema);
      expect(next.stages[0]!.pages[0]!.uischema).toEqual(def.uischema);
    });
  });

  describe('add stage via edge +', () => {
    it('addStageAfter inserts after the anchor and links anchor → new', () => {
      const d = emptyDefinition();
      const anchorId = firstStage(d).id;
      const next = addStageAfter(d, anchorId);
      expect(next.stages).toHaveLength(2);
      expect(next.stages[1]!.id).not.toBe(anchorId);
      expect(next.edges).toHaveLength(1);
      expect(next.edges[0]).toMatchObject({ source: anchorId, target: next.stages[1]!.id });
    });

    it('addStageBefore inserts before the anchor and links new → anchor', () => {
      const d = emptyDefinition();
      const anchorId = firstStage(d).id;
      const next = addStageBefore(d, anchorId);
      expect(next.stages).toHaveLength(2);
      expect(next.stages[0]!.id).not.toBe(anchorId);
      expect(next.edges[0]).toMatchObject({ source: next.stages[0]!.id, target: anchorId });
    });

    it('hasIncoming/hasOutgoing reflect a stage’s connections', () => {
      const d = emptyDefinition();
      const anchorId = firstStage(d).id;
      expect(hasIncoming(d, anchorId)).toBe(false);
      expect(hasOutgoing(d, anchorId)).toBe(false);
      const next = addStageAfter(d, anchorId);
      const newId = next.stages[1]!.id;
      expect(hasOutgoing(next, anchorId)).toBe(true); // anchor now links forward
      expect(hasIncoming(next, anchorId)).toBe(false);
      expect(hasIncoming(next, newId)).toBe(true);
      expect(hasOutgoing(next, newId)).toBe(false);
    });
  });

  describe('edges', () => {
    it('connect adds an edge; ignores self-links and duplicates', () => {
      const two = addStage(emptyDefinition());
      const [a, b] = [two.stages[0]!.id, two.stages[1]!.id];
      expect(connect(two, a, a).edges).toHaveLength(0); // self
      const once = connect(two, a, b);
      expect(once.edges).toHaveLength(1);
      expect(connect(once, a, b).edges).toHaveLength(1); // duplicate ignored
    });

    it('disconnect removes an edge by id', () => {
      const two = addStage(emptyDefinition());
      const linked = connect(two, two.stages[0]!.id, two.stages[1]!.id);
      const after = disconnect(linked, linked.edges[0]!.id);
      expect(after.edges).toHaveLength(0);
    });
  });
});
