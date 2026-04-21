import type { UISchemaElement } from "@jsonforms/core";
import { create } from "zustand";
import type {
  FieldType,
  HandoffPayload,
  PaletteItem,
  SchemaDoc,
  ScopeIssue,
  StudioPath,
  StudioResult,
  UiSchemaDoc,
} from "../model/types.js";
import {
  addCustomRendererField,
  addNewField,
  buildLayoutNode,
  changePropertyType,
  getNodeAt,
  insertNode,
  moveNode,
  removeNode,
  removeNodeWithSchema,
  renameProperty,
} from "../util/schema-ops.js";
import { validateScopes } from "../util/scope-validation.js";
import {
  clearHistory,
  emptyHistory,
  type History,
  pushHistory,
  redoHistory,
  type Snapshot,
  undoHistory,
} from "./history.js";

export interface StudioState {
  schema: SchemaDoc;
  uiSchema: UiSchemaDoc;
  readonly: boolean;
  selection: StudioPath | null;
  history: History;
  issues: ScopeIssue[];
  hydrated: boolean;
  initialize: (payload: HandoffPayload) => void;
  reset: () => void;
  select: (path: StudioPath | null) => void;
  applyPaletteItem: (
    item: PaletteItem,
    parentPath: StudioPath,
    index: number,
  ) => void;
  moveExisting: (from: StudioPath, toParent: StudioPath, toIndex: number) => void;
  deleteAt: (path: StudioPath) => void;
  patchSelectedNode: (patch: Partial<UISchemaElement>) => void;
  replaceSelectedSubtree: (subtree: UISchemaElement) => void;
  replaceSchema: (schema: SchemaDoc) => void;
  renamePropertyKey: (oldKey: string, newKey: string) => void;
  changePropertyType: (key: string, fieldType: FieldType) => void;
  undo: () => void;
  redo: () => void;
  clearHistoryStack: () => void;
  canApply: () => boolean;
  toResult: () => StudioResult;
}

const emptySchema = (): SchemaDoc => ({ type: "object", properties: {} });
const emptyUi = (): UiSchemaDoc =>
  ({ type: "VerticalLayout", elements: [] }) as unknown as UiSchemaDoc;

function snapshot(schema: SchemaDoc, uiSchema: UiSchemaDoc): Snapshot {
  return { schema, uiSchema };
}

export const useStudioStore = create<StudioState>((set, get) => ({
  schema: emptySchema(),
  uiSchema: emptyUi(),
  readonly: false,
  selection: null,
  history: emptyHistory(),
  issues: [],
  hydrated: false,

  initialize: (payload) => {
    const schema = (payload.schema as unknown as SchemaDoc) ?? emptySchema();
    const uiSchema = (payload.uiSchema as unknown as UiSchemaDoc) ?? emptyUi();
    if (!("type" in schema) || schema.type !== "object") {
      (schema as SchemaDoc).type = "object";
    }
    if (!("type" in uiSchema)) {
      Object.assign(uiSchema, emptyUi());
    }
    set({
      schema,
      uiSchema,
      readonly: payload.readonly,
      selection: null,
      history: emptyHistory(),
      issues: validateScopes(schema, uiSchema),
      hydrated: true,
    });
  },

  reset: () =>
    set({
      schema: emptySchema(),
      uiSchema: emptyUi(),
      readonly: false,
      selection: null,
      history: emptyHistory(),
      issues: [],
      hydrated: false,
    }),

  select: (path) => set({ selection: path }),

  applyPaletteItem: (item, parentPath, index) => {
    const state = get();
    if (state.readonly) return;
    const before = snapshot(state.schema, state.uiSchema);

    let nextSchema = state.schema;
    let nextUi = state.uiSchema;

    if (item.kind === "layout") {
      nextUi = insertNode(state.uiSchema, parentPath, index, buildLayoutNode(item.layoutType));
    } else if (item.kind === "new-field") {
      const result = addNewField(
        state.schema,
        state.uiSchema,
        parentPath,
        index,
        item.fieldType,
      );
      nextSchema = result.schema;
      nextUi = result.uiSchema;
    } else if (item.kind === "bound-control") {
      const control: UISchemaElement = {
        type: "Control",
        scope: `#/properties/${item.propertyPath}`,
      } as UISchemaElement;
      nextUi = insertNode(state.uiSchema, parentPath, index, control);
    } else if (item.kind === "custom-renderer") {
      const result = addCustomRendererField(
        state.schema,
        state.uiSchema,
        parentPath,
        index,
        item.rendererKey,
      );
      nextSchema = result.schema;
      nextUi = result.uiSchema;
    }

    set({
      schema: nextSchema,
      uiSchema: nextUi,
      history: pushHistory(state.history, before),
      issues: validateScopes(nextSchema, nextUi),
    });
  },

  moveExisting: (from, toParent, toIndex) => {
    const state = get();
    if (state.readonly) return;
    const before = snapshot(state.schema, state.uiSchema);
    const nextUi = moveNode(state.uiSchema, from, toParent, toIndex);
    set({
      uiSchema: nextUi,
      history: pushHistory(state.history, before),
      issues: validateScopes(state.schema, nextUi),
      selection: null,
    });
  },

  deleteAt: (path) => {
    const state = get();
    if (state.readonly) return;
    const before = snapshot(state.schema, state.uiSchema);
    const { schema: nextSchema, uiSchema: nextUi } = removeNodeWithSchema(
      state.schema,
      state.uiSchema,
      path,
    );
    set({
      schema: nextSchema,
      uiSchema: nextUi,
      selection: null,
      history: pushHistory(state.history, before),
      issues: validateScopes(nextSchema, nextUi),
    });
  },

  patchSelectedNode: (patch) => {
    const state = get();
    if (state.readonly || !state.selection) return;
    const before = snapshot(state.schema, state.uiSchema);
    const nextUi = structuredClone(state.uiSchema);
    const node = getNodeAt(nextUi, state.selection);
    if (!node) return;
    Object.assign(node, patch);
    set({
      uiSchema: nextUi,
      history: pushHistory(state.history, before),
      issues: validateScopes(state.schema, nextUi),
    });
  },

  replaceSelectedSubtree: (subtree) => {
    const state = get();
    if (state.readonly || !state.selection) return;
    const before = snapshot(state.schema, state.uiSchema);
    const path = state.selection;
    let nextUi = state.uiSchema;
    if (path.length === 0) {
      nextUi = subtree as UiSchemaDoc;
    } else {
      const removed = removeNode(state.uiSchema, path);
      nextUi = insertNode(removed, path.slice(0, -1), path[path.length - 1], subtree);
    }
    set({
      uiSchema: nextUi,
      history: pushHistory(state.history, before),
      issues: validateScopes(state.schema, nextUi),
    });
  },

  changePropertyType: (key, fieldType) => {
    const state = get();
    if (state.readonly) return;
    const before = snapshot(state.schema, state.uiSchema);
    const result = changePropertyType(state.schema, state.uiSchema, key, fieldType);
    set({
      schema: result.schema,
      uiSchema: result.uiSchema,
      history: pushHistory(state.history, before),
      issues: validateScopes(result.schema, result.uiSchema),
    });
  },

  replaceSchema: (nextSchema) => {
    const state = get();
    if (state.readonly) return;
    const before = snapshot(state.schema, state.uiSchema);
    set({
      schema: nextSchema,
      history: pushHistory(state.history, before),
      issues: validateScopes(nextSchema, state.uiSchema),
    });
  },

  renamePropertyKey: (oldKey, newKey) => {
    const state = get();
    if (state.readonly) return;
    const before = snapshot(state.schema, state.uiSchema);
    const result = renameProperty(state.schema, state.uiSchema, oldKey, newKey);
    set({
      schema: result.schema,
      uiSchema: result.uiSchema,
      history: pushHistory(state.history, before),
      issues: validateScopes(result.schema, result.uiSchema),
    });
  },

  undo: () => {
    const state = get();
    if (state.readonly) return;
    const current = snapshot(state.schema, state.uiSchema);
    const result = undoHistory(state.history, current);
    if (!result) return;
    set({
      schema: result.snapshot.schema,
      uiSchema: result.snapshot.uiSchema,
      history: result.history,
      issues: validateScopes(result.snapshot.schema, result.snapshot.uiSchema),
      selection: null,
    });
  },

  redo: () => {
    const state = get();
    if (state.readonly) return;
    const current = snapshot(state.schema, state.uiSchema);
    const result = redoHistory(state.history, current);
    if (!result) return;
    set({
      schema: result.snapshot.schema,
      uiSchema: result.snapshot.uiSchema,
      history: result.history,
      issues: validateScopes(result.snapshot.schema, result.snapshot.uiSchema),
      selection: null,
    });
  },

  clearHistoryStack: () => set({ history: clearHistory() }),

  canApply: () => {
    const state = get();
    if (state.readonly) return false;
    return state.issues.length === 0;
  },

  toResult: () => {
    const state = get();
    return {
      schema: state.schema as unknown as Record<string, unknown>,
      uiSchema: state.uiSchema as unknown as Record<string, unknown>,
    };
  },
}));
