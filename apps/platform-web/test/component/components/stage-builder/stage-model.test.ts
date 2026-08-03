import { describe, expect, it } from 'vitest';
import {
  createPage,
  createStage,
  emptyDefinition,
  setMeta,
  normalizeDefinition,
  removeStage,
  renameStage,
  addPage,
  removePage,
  reorderPages,
  renamePage,
  updatePageDefinition,
  connect,
  disconnect,
  hasIncoming,
  hasOutgoing,
  addStageAfter,
  addStageBefore,
  setStagePosition,
  addStageAtEnd,
  addStage,
} from '@/components/stage-builder/stage-model';
import type { MultiStageDefinition } from '@/components/stage-builder/stage-model';

const firstStage = (d: MultiStageDefinition) => d.stages[0]!;

describe('Stage Model Unit Test Suite', () => {
  describe('stage-model main components', () => {
    it('creates default entities: page, stage, empty definition', () => {
      const page = createPage();
      expect(page.id).toBeDefined();
      expect(page.name).toBe('Untitled page');

      const stage = createStage({ x: 10, y: 20 });
      expect(stage.id).toBeDefined();
      expect(stage.position).toEqual({ x: 10, y: 20 });
      expect(stage.pages).toHaveLength(1);

      const empty = emptyDefinition();
      expect(empty.name).toBe('Untitled multi-stage form');
      expect(empty.stages).toHaveLength(1);
    });

    it('modifies metadata via setMeta', () => {
      const empty = emptyDefinition();
      const result = setMeta(empty, { name: 'Flow New', description: 'Updated info' });
      expect(result.name).toBe('Flow New');
      expect(result.description).toBe('Updated info');
    });

    it('normalizes partial or empty raw data in normalizeDefinition', () => {
      // Normalizes empty / missing stages
      const resultEmpty = normalizeDefinition(null);
      expect(resultEmpty.name).toBe('Untitled multi-stage form');
      expect(resultEmpty.stages).toHaveLength(1);

      // Normalizes existing stages with missing attributes
      const raw = {
        name: 'Custom',
        stages: [
          {
            id: 's-1',
            name: 'Stage 1',
            // no pages
            // no position
          },
        ],
      };
      const normalized = normalizeDefinition(raw as any);
      expect(normalized.name).toBe('Custom');
      expect(normalized.stages[0]?.position).toEqual({ x: 0, y: 0 });
      expect(normalized.stages[0]?.pages).toEqual([]);
    });

    it('renames and removes stages under correct constraints', () => {
      const def: MultiStageDefinition = {
        name: 'Flow',
        description: '',
        stages: [
          { id: 's1', name: 'S1', position: { x: 0, y: 0 }, pages: [] },
          { id: 's2', name: 'S2', position: { x: 100, y: 0 }, pages: [] },
        ],
        edges: [{ id: 'e1', source: 's1', target: 's2' }],
      };

      // Rename
      const renamed = renameStage(def, 's1', 'New S1');
      expect(renamed.stages[0]?.name).toBe('New S1');

      // Remove stage when multiple exist
      const removed = removeStage(def, 's2');
      expect(removed.stages).toHaveLength(1);
      expect(removed.stages[0]?.id).toBe('s1');
      expect(removed.edges).toHaveLength(0);

      // Fails to remove when it is the last stage
      const singleDef: MultiStageDefinition = {
        ...def,
        stages: [def.stages[0]!],
      };
      const notRemoved = removeStage(singleDef, 's1');
      expect(notRemoved.stages).toHaveLength(1);
    });

    it('adds, removes, reorders and renames pages inside stages', () => {
      const def: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [
          {
            id: 's1',
            name: 'Stage',
            position: { x: 0, y: 0 },
            pages: [
              { id: 'p1', name: 'P1', description: '', schema: {}, uischema: {} },
              { id: 'p2', name: 'P2', description: '', schema: {}, uischema: {} },
            ],
          },
        ],
        edges: [],
      };

      // Add page
      const added = addPage(def, 's1');
      expect(added.stages[0]?.pages).toHaveLength(3);
      expect(added.stages[0]?.pages[2]?.name).toBe('Untitled page');

      // Reorder pages
      const reordered = reorderPages(def, 's1', 0, 1);
      expect(reordered.stages[0]?.pages[0]?.id).toBe('p2');
      expect(reordered.stages[0]?.pages[1]?.id).toBe('p1');

      // Rename page
      const renamed = renamePage(def, 's1', 'p1', 'Page Name');
      expect(renamed.stages[0]?.pages[0]?.name).toBe('Page Name');

      // Remove page when multiple exist
      const removed = removePage(def, 's1', 'p1');
      expect(removed.stages[0]?.pages).toHaveLength(1);
      expect(removed.stages[0]?.pages[0]?.id).toBe('p2');

      // Fails to remove page when only one page exists in stage
      const singlePageDef: MultiStageDefinition = {
        ...def,
        stages: [{ ...def.stages[0]!, pages: [def.stages[0]!.pages[0]!] }],
      };
      const notRemoved = removePage(singlePageDef, 's1', 'p1');
      expect(notRemoved.stages[0]?.pages).toHaveLength(1);
    });

    it('updates page schema definitions and bubbles title to page name', () => {
      const def: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [
          {
            id: 's1',
            name: 'Stage',
            position: { x: 0, y: 0 },
            pages: [{ id: 'p1', name: 'Old Name', description: '', schema: {}, uischema: {} }],
          },
        ],
        edges: [],
      };

      const newDef = {
        schema: { title: 'New Form Title', properties: { user: { type: 'string' } } },
        uischema: { type: 'VerticalLayout', elements: [] },
      };

      const result = updatePageDefinition(def, 's1', 'p1', newDef);
      expect(result.stages[0]?.pages[0]?.name).toBe('New Form Title');
      expect(result.stages[0]?.pages[0]?.schema).toEqual(newDef.schema);
    });

    it('manages connections (connect, disconnect, incoming, outgoing checks)', () => {
      const def: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [
          { id: 's1', name: 'S1', position: { x: 0, y: 0 }, pages: [] },
          { id: 's2', name: 'S2', position: { x: 320, y: 0 }, pages: [] },
        ],
        edges: [],
      };

      // Connect
      const connected = connect(def, 's1', 's2');
      expect(connected.edges).toHaveLength(1);
      expect(connected.edges[0]?.source).toBe('s1');
      expect(connected.edges[0]?.target).toBe('s2');

      // Duplicate connect is ignored
      const dup = connect(connected, 's1', 's2');
      expect(dup.edges).toHaveLength(1);

      // Self-link connect is ignored
      const self = connect(def, 's1', 's1');
      expect(self.edges).toHaveLength(0);

      // Checks
      expect(hasIncoming(connected, 's2')).toBe(true);
      expect(hasIncoming(connected, 's1')).toBe(false);
      expect(hasOutgoing(connected, 's1')).toBe(true);
      expect(hasOutgoing(connected, 's2')).toBe(false);

      // Disconnect
      const edgeId = connected.edges[0]!.id;
      const disconnected = disconnect(connected, edgeId);
      expect(disconnected.edges).toHaveLength(0);
    });

    it('inserts stages immediately after or before anchors with edge links', () => {
      const def: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [{ id: 's1', name: 'Stage 1', position: { x: 100, y: 20 }, pages: [] }],
        edges: [],
      };

      // Add after
      const after = addStageAfter(def, 's1');
      expect(after.stages).toHaveLength(2);
      expect(after.stages[1]?.position).toEqual({ x: 420, y: 20 });
      expect(after.edges).toHaveLength(1);
      expect(after.edges[0]?.source).toBe('s1');
      expect(after.edges[0]?.target).toBe(after.stages[1]?.id);

      // Add before
      const before = addStageBefore(def, 's1');
      expect(before.stages).toHaveLength(2);
      expect(before.stages[0]?.position).toEqual({ x: -220, y: 20 });
      expect(before.edges).toHaveLength(1);
      expect(before.edges[0]?.source).toBe(before.stages[0]?.id);
      expect(before.edges[0]?.target).toBe('s1');
    });
    it('emptyDefinition has one stage with one page', () => {
      const d = emptyDefinition();
      expect(d.stages).toHaveLength(1);
      expect(firstStage(d).pages).toHaveLength(1);
      expect(d.edges).toEqual([]);
    });
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

    it('updatePageDefinition bubbles the form title up to the page name', () => {
      const d = emptyDefinition();
      const stageId = d.stages[0]!.id;
      const pageId = d.stages[0]!.pages[0]!.id;
      const titled = updatePageDefinition(d, stageId, pageId, {
        schema: { type: 'object', title: 'Applicant details' },
        uischema: { type: 'VerticalLayout' },
      });
      expect(titled.stages[0]!.pages[0]!.name).toBe('Applicant details');
      // A blank title keeps the existing page name.
      const blank = updatePageDefinition(titled, stageId, pageId, {
        schema: { type: 'object' },
        uischema: { type: 'VerticalLayout' },
      });
      expect(blank.stages[0]!.pages[0]!.name).toBe('Applicant details');
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

    it('addStageAtEnd appends a stage connected to the current last stage (builds a chain)', () => {
      let d = emptyDefinition();
      const first = firstStage(d).id;
      d = addStageAtEnd(d);
      const second = d.stages[1]!.id;
      expect(d.stages).toHaveLength(2);
      expect(d.edges).toContainEqual(expect.objectContaining({ source: first, target: second }));
      d = addStageAtEnd(d);
      const third = d.stages[2]!.id;
      expect(d.edges).toContainEqual(expect.objectContaining({ source: second, target: third }));
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

  describe('normalizeDefinition', () => {
    it('adds a missing edges array (template-derived form) without losing stages', () => {
      // A barebones form stores `{ stages }` with no `edges` and stages without `position`.
      const raw = { stages: [{ id: 's1', name: 'Stage 1', pages: [{ id: 'p1', name: 'P1' }] }] };
      const def = normalizeDefinition(raw);
      expect(def.edges).toEqual([]);
      expect(def.stages).toHaveLength(1);
      expect(def.stages[0]!.position).toEqual({ x: 0, y: 0 });
      expect(def.stages[0]!.pages).toHaveLength(1);
    });

    it('falls back to a fresh definition when there are no stages', () => {
      expect(normalizeDefinition({}).stages).toHaveLength(1);
      expect(normalizeDefinition(undefined).stages).toHaveLength(1);
      expect(normalizeDefinition({ stages: [] }).edges).toEqual([]);
    });

    it('preserves a complete definition', () => {
      const complete = emptyDefinition();
      const next = normalizeDefinition(complete);
      expect(next.stages).toHaveLength(complete.stages.length);
      expect(next.edges).toEqual([]);
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

  describe('stage-model additional coverage', () => {
    it('sets stage position successfully', () => {
      const def: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [{ id: 's1', name: 'S1', position: { x: 0, y: 0 }, pages: [] }],
        edges: [],
      };
      const result = setStagePosition(def, 's1', { x: 50, y: 80 });
      expect(result.stages[0]?.position).toEqual({ x: 50, y: 80 });
    });

    it('addStageAtEnd handles empty stages list successfully', () => {
      const emptyDef: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [],
        edges: [],
      };
      const result = addStageAtEnd(emptyDef);
      expect(result.stages).toHaveLength(1);
      expect(result.stages[0]?.position).toEqual({ x: 0, y: 0 });
    });

    it('reorderPages returns unmodified stage if from index is out of bounds', () => {
      const def: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [
          {
            id: 's1',
            name: 'Stage',
            position: { x: 0, y: 0 },
            pages: [{ id: 'p1', name: 'P1', description: '', schema: {}, uischema: {} }],
          },
        ],
        edges: [],
      };
      const result = reorderPages(def, 's1', 99, 0);
      expect(result).toEqual(def);
    });

    it('updatePageDefinition handles omitted, empty, or whitespace-only titles without changing page name', () => {
      const def: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [
          {
            id: 's1',
            name: 'Stage',
            position: { x: 0, y: 0 },
            pages: [
              { id: 'p1', name: 'Original Page Name', description: '', schema: {}, uischema: {} },
            ],
          },
        ],
        edges: [],
      };

      const newDefNoTitle = {
        schema: { properties: {} },
        uischema: { type: 'VerticalLayout', elements: [] },
      };
      const result1 = updatePageDefinition(def, 's1', 'p1', newDefNoTitle as any);
      expect(result1.stages[0]?.pages[0]?.name).toBe('Original Page Name');

      const newDefEmptyTitle = {
        schema: { title: '  ', properties: {} },
        uischema: { type: 'VerticalLayout', elements: [] },
      };
      const result2 = updatePageDefinition(def, 's1', 'p1', newDefEmptyTitle as any);
      expect(result2.stages[0]?.pages[0]?.name).toBe('Original Page Name');
    });

    it('addStageAfter and addStageBefore exit early if anchor stage is invalid', () => {
      const def: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [{ id: 's1', name: 'Stage 1', position: { x: 100, y: 20 }, pages: [] }],
        edges: [],
      };

      expect(addStageAfter(def, 'invalid-stage-id')).toBe(def);
      expect(addStageBefore(def, 'invalid-stage-id')).toBe(def);
    });

    it('covers removeStage healing edges: chain, self-link, and duplicate link skip', () => {
      const def: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [
          { id: 's1', name: 'S1', position: { x: 0, y: 0 }, pages: [] },
          { id: 's2', name: 'S2', position: { x: 320, y: 0 }, pages: [] },
          { id: 's3', name: 'S3', position: { x: 640, y: 0 }, pages: [] },
        ],
        edges: [
          { id: 'e1', source: 's1', target: 's2' },
          { id: 'e2', source: 's2', target: 's3' },
          { id: 'e3', source: 's2', target: 's1' },
          { id: 'e4', source: 's1', target: 's3' },
        ],
      };

      const result = removeStage(def, 's2');
      expect(result.stages).toHaveLength(2);
      expect(result.stages.map((s) => s.id)).toEqual(['s1', 's3']);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]?.id).toBe('e4');
    });

    it('heals edge chain when removing middle stage without pre-existing edges', () => {
      const def: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [
          { id: 's1', name: 'S1', position: { x: 0, y: 0 }, pages: [] },
          { id: 's2', name: 'S2', position: { x: 320, y: 0 }, pages: [] },
          { id: 's3', name: 'S3', position: { x: 640, y: 0 }, pages: [] },
        ],
        edges: [
          { id: 'e1', source: 's1', target: 's2' },
          { id: 'e2', source: 's2', target: 's3' },
        ],
      };

      const result = removeStage(def, 's2');
      expect(result.stages).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]?.source).toBe('s1');
      expect(result.edges[0]?.target).toBe('s3');
    });

    it('covers normalizeDefinition details, addStageAtEnd on empty definition, and hasIncoming/hasOutgoing edges nullish check', () => {
      // 1. Call normalizeDefinition with nullish/non-array pages and edges
      const raw = {
        name: 'Custom Flow',
        description: 'Custom description',
        stages: [
          {
            id: 'stage-custom-1',
            name: 'Custom Stage',
            pages: null,
          },
        ],
        edges: null,
      };

      const normalized = normalizeDefinition(raw as any);
      expect(normalized.name).toBe('Custom Flow');
      expect(normalized.description).toBe('Custom description');
      expect(normalized.stages[0]?.position).toEqual({ x: 0, y: 0 });
      expect(normalized.stages[0]?.pages).toEqual([]);
      expect(normalized.edges).toEqual([]);

      // 2. Call normalizeDefinition with normal arrays for pages and edges (Branch 1)
      const rawNormal = {
        name: 'Normal Flow',
        description: 'Normal description',
        stages: [
          {
            id: 'stage-1',
            name: 'Stage 1',
            pages: [{ id: 'p1', name: 'Page 1' }],
          },
        ],
        edges: [{ id: 'e1', source: 'stage-1', target: 'stage-2' }],
      };
      const normalizedNormal = normalizeDefinition(rawNormal as any);
      expect(normalizedNormal.stages[0]?.pages).toHaveLength(1);
      expect(normalizedNormal.edges).toHaveLength(1);

      // addStageAtEnd when stages length is 0 (Branch 2)
      const emptyDef: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [],
        edges: [],
      };
      const resultEmpty = addStageAtEnd(emptyDef);
      expect(resultEmpty.stages).toHaveLength(1);
      expect(resultEmpty.stages[0]?.position).toEqual({ x: 0, y: 0 });

      // addStageAtEnd when stages length > 0 (Branch 1)
      const nonLastDef: MultiStageDefinition = {
        name: '',
        description: '',
        stages: [{ id: 's1', name: 'S1', position: { x: 0, y: 0 }, pages: [] }],
        edges: [],
      };
      const resultNonEmpty = addStageAtEnd(nonLastDef);
      expect(resultNonEmpty.stages).toHaveLength(2);
      expect(resultNonEmpty.edges).toHaveLength(1);

      // hasIncoming/hasOutgoing edges nullish fallback ?? []
      const defWithNullEdges = {
        name: '',
        description: '',
        stages: [],
        edges: null,
      };
      expect(hasIncoming(defWithNullEdges as any, 's1')).toBe(false);
      expect(hasOutgoing(defWithNullEdges as any, 's1')).toBe(false);
    });
  });
});
