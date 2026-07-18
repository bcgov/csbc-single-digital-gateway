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
} from '@/components/stage-builder/stage-model';
import type { MultiStageDefinition } from '@/components/stage-builder/stage-model';

describe('stage-model pure functions', () => {
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
});
