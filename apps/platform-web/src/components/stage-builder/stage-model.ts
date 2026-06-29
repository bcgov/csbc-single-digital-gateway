/**
 * The stage builder's in-browser model for a multi-stage form, and pure helpers over it. Stored in
 * `document_versions.schema` as `{ stages, edges }`; a page mirrors a basic-form (`schema`/`uischema`),
 * so the page editor is the existing FormBuilder. This module is the source of truth — unit-tested.
 */

export interface StagePage {
  id: string;
  name: string;
  description: string;
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

export interface Stage {
  id: string;
  name: string;
  position: { x: number; y: number };
  pages: StagePage[];
}

export interface StageEdge {
  id: string;
  source: string;
  target: string;
}

export interface MultiStageDefinition {
  /** Form-level name + description (edited in the canvas panel). */
  name: string;
  description: string;
  stages: Stage[];
  edges: StageEdge[];
}

const DEFAULT_NAME = 'Untitled multi-stage form';

const uid = (): string => crypto.randomUUID();

const emptyForm = (): Pick<StagePage, 'schema' | 'uischema'> => ({
  schema: { type: 'object', properties: {}, required: [] },
  uischema: { type: 'VerticalLayout', elements: [] },
});

export function createPage(): StagePage {
  return { id: uid(), name: 'Untitled page', description: '', ...emptyForm() };
}

export function createStage(position: { x: number; y: number }): Stage {
  return { id: uid(), name: 'New stage', position, pages: [createPage()] };
}

/** A fresh multi-stage form: one stage with one empty page. */
export function emptyDefinition(): MultiStageDefinition {
  return { name: DEFAULT_NAME, description: '', stages: [createStage({ x: 0, y: 0 })], edges: [] };
}

/** Update the form-level name/description (the canvas panel). */
export function setMeta(
  def: MultiStageDefinition,
  meta: { name?: string; description?: string },
): MultiStageDefinition {
  return { ...def, ...meta };
}

/**
 * Coerce a stored/partial definition into a complete one. Forms created from the type template store
 * `{ stages }` with no `edges` (and stages may lack `position`), so the raw blob isn't a safe
 * `MultiStageDefinition` — without this, `edges.map`/`edges.filter` throw. Empty → a fresh definition.
 */
export function normalizeDefinition(
  raw: { stages?: unknown; edges?: unknown } | null | undefined,
): MultiStageDefinition {
  const meta = raw as { name?: unknown; description?: unknown } | null | undefined;
  const name = typeof meta?.name === 'string' ? meta.name : DEFAULT_NAME;
  const description = typeof meta?.description === 'string' ? meta.description : '';
  const rawStages = Array.isArray(raw?.stages) ? (raw.stages as Stage[]) : [];
  if (rawStages.length === 0) {
    return { ...emptyDefinition(), name, description };
  }
  const stages = rawStages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    position: stage.position ?? { x: 0, y: 0 },
    pages: Array.isArray(stage.pages) ? stage.pages : [],
  }));
  const edges = Array.isArray(raw?.edges) ? (raw.edges as StageEdge[]) : [];
  return { name, description, stages, edges };
}

/** Update the stage with `id` via `fn`; other stages untouched. */
function mapStage(
  def: MultiStageDefinition,
  id: string,
  fn: (stage: Stage) => Stage,
): MultiStageDefinition {
  return { ...def, stages: def.stages.map((stage) => (stage.id === id ? fn(stage) : stage)) };
}

// ── Stages ───────────────────────────────────────────────────────────────────────────────────────

/** Append a new standalone stage, auto-positioned so xyflow nodes don't stack at the origin. */
export function addStage(def: MultiStageDefinition): MultiStageDefinition {
  const position = { x: def.stages.length * 320, y: 0 };
  return { ...def, stages: [...def.stages, createStage(position)] };
}

/** Append a stage and connect it to the current last stage (the "Add stage" toolbar action). */
export function addStageAtEnd(def: MultiStageDefinition): MultiStageDefinition {
  const last = def.stages[def.stages.length - 1];
  return last ? addStageAfter(def, last.id) : addStage(def);
}

/**
 * Remove a stage — refuses to remove the last one. Edges touching it are dropped, but the chain is
 * healed: each predecessor is reconnected to each successor (so deleting a middle stage joins its
 * incoming and outgoing neighbours). Self-links and duplicates are skipped.
 */
export function removeStage(def: MultiStageDefinition, stageId: string): MultiStageDefinition {
  if (def.stages.length <= 1) {
    return def;
  }
  const sources = def.edges.filter((e) => e.target === stageId).map((e) => e.source);
  const targets = def.edges.filter((e) => e.source === stageId).map((e) => e.target);
  const edges = def.edges.filter((e) => e.source !== stageId && e.target !== stageId);
  for (const source of sources) {
    for (const target of targets) {
      if (source !== target && !edges.some((e) => e.source === source && e.target === target)) {
        edges.push({ id: uid(), source, target });
      }
    }
  }
  return { ...def, stages: def.stages.filter((stage) => stage.id !== stageId), edges };
}

export function renameStage(
  def: MultiStageDefinition,
  stageId: string,
  name: string,
): MultiStageDefinition {
  return mapStage(def, stageId, (stage) => ({ ...stage, name }));
}

export function setStagePosition(
  def: MultiStageDefinition,
  stageId: string,
  position: { x: number; y: number },
): MultiStageDefinition {
  return mapStage(def, stageId, (stage) => ({ ...stage, position }));
}

// ── Pages ────────────────────────────────────────────────────────────────────────────────────────

export function addPage(def: MultiStageDefinition, stageId: string): MultiStageDefinition {
  return mapStage(def, stageId, (stage) => ({ ...stage, pages: [...stage.pages, createPage()] }));
}

/** Remove a page — refuses to remove the last page in a stage. */
export function removePage(
  def: MultiStageDefinition,
  stageId: string,
  pageId: string,
): MultiStageDefinition {
  return mapStage(def, stageId, (stage) =>
    stage.pages.length <= 1
      ? stage
      : { ...stage, pages: stage.pages.filter((page) => page.id !== pageId) },
  );
}

export function reorderPages(
  def: MultiStageDefinition,
  stageId: string,
  from: number,
  to: number,
): MultiStageDefinition {
  return mapStage(def, stageId, (stage) => {
    const pages = [...stage.pages];
    const moved = pages.splice(from, 1)[0];
    if (moved === undefined) {
      return stage;
    }
    pages.splice(to, 0, moved);
    return { ...stage, pages };
  });
}

function mapPage(
  def: MultiStageDefinition,
  stageId: string,
  pageId: string,
  fn: (page: StagePage) => StagePage,
): MultiStageDefinition {
  return mapStage(def, stageId, (stage) => ({
    ...stage,
    pages: stage.pages.map((page) => (page.id === pageId ? fn(page) : page)),
  }));
}

export function renamePage(
  def: MultiStageDefinition,
  stageId: string,
  pageId: string,
  name: string,
): MultiStageDefinition {
  return mapPage(def, stageId, pageId, (page) => ({ ...page, name }));
}

/** Write a page's authored form definition (from the FormBuilder dialog). */
export function updatePageDefinition(
  def: MultiStageDefinition,
  stageId: string,
  pageId: string,
  definition: { schema: Record<string, unknown>; uischema: Record<string, unknown> },
): MultiStageDefinition {
  // Bubble the form's title up to the page name (keep the existing name if the title is blank).
  const title = definition.schema.title;
  const name = typeof title === 'string' && title.trim() !== '' ? title.trim() : undefined;
  return mapPage(def, stageId, pageId, (page) => ({
    ...page,
    name: name ?? page.name,
    schema: definition.schema,
    uischema: definition.uischema,
  }));
}

// ── Edges ────────────────────────────────────────────────────────────────────────────────────────

/** Add a flow edge between two stages; ignores self-links and duplicates. */
export function connect(
  def: MultiStageDefinition,
  source: string,
  target: string,
): MultiStageDefinition {
  if (source === target) {
    return def;
  }
  if (def.edges.some((edge) => edge.source === source && edge.target === target)) {
    return def;
  }
  return { ...def, edges: [...def.edges, { id: uid(), source, target }] };
}

export function disconnect(def: MultiStageDefinition, edgeId: string): MultiStageDefinition {
  return { ...def, edges: def.edges.filter((edge) => edge.id !== edgeId) };
}

/** Whether a stage has an incoming edge (a preceding stage). Hides the left "add before" affordance.
 * `?? []` guards a partial/stored definition with no `edges` (these are render-path reads). */
export function hasIncoming(def: MultiStageDefinition, stageId: string): boolean {
  return (def.edges ?? []).some((edge) => edge.target === stageId);
}

/** Whether a stage has an outgoing edge (a following stage). Hides the right "add after" affordance. */
export function hasOutgoing(def: MultiStageDefinition, stageId: string): boolean {
  return (def.edges ?? []).some((edge) => edge.source === stageId);
}

/** Insert a new stage immediately AFTER `stageId` and link `stageId → new`. */
export function addStageAfter(def: MultiStageDefinition, stageId: string): MultiStageDefinition {
  const index = def.stages.findIndex((s) => s.id === stageId);
  const anchor = def.stages[index];
  if (anchor === undefined) {
    return def;
  }
  const stage = createStage({ x: anchor.position.x + 320, y: anchor.position.y });
  return {
    ...def,
    stages: [...def.stages.slice(0, index + 1), stage, ...def.stages.slice(index + 1)],
    edges: [...def.edges, { id: uid(), source: stageId, target: stage.id }],
  };
}

/** Insert a new stage immediately BEFORE `stageId` and link `new → stageId`. */
export function addStageBefore(def: MultiStageDefinition, stageId: string): MultiStageDefinition {
  const index = def.stages.findIndex((s) => s.id === stageId);
  const anchor = def.stages[index];
  if (anchor === undefined) {
    return def;
  }
  const stage = createStage({ x: anchor.position.x - 320, y: anchor.position.y });
  return {
    ...def,
    stages: [...def.stages.slice(0, index), stage, ...def.stages.slice(index)],
    edges: [...def.edges, { id: uid(), source: stage.id, target: stageId }],
  };
}
