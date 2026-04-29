import { useDndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import type {
  JsonFormsRendererRegistryEntry,
  JsonSchema,
  RankedTester,
  UISchemaElement,
} from "@jsonforms/core";
import { repoRenderers } from "@repo/jsonforms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui";
import { Component, createContext, type ReactNode, useContext, useState } from "react";
import type { ScopeIssue, StudioPath } from "../model/types.js";
import { useStudioStore } from "../state/studio-store.js";
import { dropIdFor, isSelfOrDescendant, nodeDragIdFor } from "../util/drop-id.js";

export const CanvasPathContext = createContext<StudioPath>([]);

const LAYOUT_TYPES = new Set([
  "VerticalLayout",
  "HorizontalLayout",
  "Group",
  "Category",
]);

function pathsEqual(a: StudioPath, b: StudioPath): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function hasIssue(issues: ScopeIssue[], path: StudioPath): boolean {
  return issues.some((i) => pathsEqual(i.path, path));
}

function DropSlot({ parentPath, index }: { parentPath: StudioPath; index: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropIdFor(parentPath, index),
  });
  const { active } = useDndContext();
  const activeNodePath = (active?.data.current as { nodePath?: StudioPath } | undefined)
    ?.nodePath;
  const disabled =
    activeNodePath !== undefined && isSelfOrDescendant(activeNodePath, parentPath);
  return (
    <div
      ref={setNodeRef}
      data-cy={`drop-${parentPath.join(".")}-${index}`}
      className={[
        "relative z-10 h-2 rounded transition-colors",
        isOver && !disabled ? "bg-bcgov-blue/40" : "bg-transparent",
      ].join(" ")}
    />
  );
}

class RenderErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    /* swallow */
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

interface DispatchProps {
  uischema: UISchemaElement;
  schema: JsonSchema;
  path?: string;
  enabled?: boolean;
  renderers?: JsonFormsRendererRegistryEntry[];
  cells?: unknown[];
}

function pickNextRenderer(
  uischema: UISchemaElement,
  schema: JsonSchema,
): JsonFormsRendererRegistryEntry | null {
  let best: JsonFormsRendererRegistryEntry | null = null;
  let bestRank = -1;
  for (const r of repoRenderers) {
    const tester = r.tester as RankedTester;
    const rank = tester(uischema, schema, undefined as never);
    if (rank > bestRank) {
      bestRank = rank;
      best = r;
    }
  }
  return bestRank >= 0 ? best : null;
}

function DelegatedRender(props: DispatchProps) {
  const next = pickNextRenderer(props.uischema, props.schema);
  if (!next) {
    return (
      <div className="rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">
        No renderer for {(props.uischema as { type?: string }).type ?? "element"}
      </div>
    );
  }
  const R = next.renderer as React.ComponentType<DispatchProps>;
  return <R {...props} />;
}

function ChromeWrapper({
  path,
  typeLabel,
  children,
}: {
  path: StudioPath;
  typeLabel: string;
  children: ReactNode;
}) {
  const select = useStudioStore((s) => s.select);
  const selection = useStudioStore((s) => s.selection);
  const issues = useStudioStore((s) => s.issues);
  const readonly = useStudioStore((s) => s.readonly);
  const deleteAt = useStudioStore((s) => s.deleteAt);

  const isSelected = selection !== null && pathsEqual(selection, path);
  const issue = hasIssue(issues, path);

  const dragDisabled = readonly || path.length === 0;
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: nodeDragIdFor(path),
    data: { nodePath: path },
    disabled: dragDisabled,
  });

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    select(path);
  };

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteAt(path);
  };

  const outlineClass = isSelected
    ? "border-2 border-solid border-bcgov-blue"
    : "border border-dashed border-border hover:border-bcgov-blue/60";

  return (
    <div
      ref={setDragRef}
      data-cy={`canvas-node-${path.join(".")}`}
      onClick={onClick}
      className={[
        "group relative rounded pt-3",
        outlineClass,
        isDragging ? "opacity-40" : "",
      ].join(" ")}
    >
      <span
        className={[
          "absolute -top-2 left-2 z-20 flex items-center gap-1 rounded bg-bcgov-blue px-1 text-[10px] text-white",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        ].join(" ")}
      >
        {!dragDisabled && (
          <button
            type="button"
            aria-label="Drag to move"
            className="cursor-grab text-white/90 hover:text-white"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            data-cy={`node-drag-handle-${path.join(".")}`}
          >
            ⋮⋮
          </button>
        )}
        {typeLabel}
      </span>
      {issue && (
        <span
          className="absolute -top-1 -right-1 z-20 h-2 w-2 rounded-full bg-destructive"
          title="Unresolved scope"
        />
      )}
      {isSelected && !readonly && path.length > 0 && (
        <button
          type="button"
          onClick={onDelete}
          data-cy={`delete-${path.join(".")}`}
          className="absolute -top-2 right-2 z-20 rounded bg-destructive px-1 text-[10px] text-white"
        >
          ✕
        </button>
      )}
      {children}
    </div>
  );
}

function LayoutChildren({
  path,
  elements,
  schema,
  direction,
  dispatchProps,
}: {
  path: StudioPath;
  elements: UISchemaElement[];
  schema: JsonSchema;
  direction: "col" | "row";
  dispatchProps: DispatchProps;
}) {
  const containerClass =
    direction === "row" ? "flex flex-row gap-3" : "flex flex-col gap-2";
  return (
    <div className={containerClass}>
      <DropSlot parentPath={path} index={0} />
      {elements.map((child, i) => {
        const childPath = [...path, i];
        return (
          <div key={i} className="flex flex-col gap-1">
            <CanvasPathContext.Provider value={childPath}>
              <ChromeElement
                uischema={child}
                schema={schema}
                path={dispatchProps.path}
                enabled={dispatchProps.enabled}
                renderers={dispatchProps.renderers}
                cells={dispatchProps.cells}
              />
            </CanvasPathContext.Provider>
            <DropSlot parentPath={path} index={i + 1} />
          </div>
        );
      })}
    </div>
  );
}

function CategorizationChrome({
  path,
  categories,
  schema,
  dispatchProps,
}: {
  path: StudioPath;
  categories: UISchemaElement[];
  schema: JsonSchema;
  dispatchProps: DispatchProps;
}) {
  const applyPaletteItem = useStudioStore((s) => s.applyPaletteItem);
  const select = useStudioStore((s) => s.select);
  const readonly = useStudioStore((s) => s.readonly);
  const [active, setActive] = useState(0);

  const safeActive = Math.min(active, Math.max(0, categories.length - 1));

  const onAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    applyPaletteItem(
      { kind: "layout", layoutType: "Category" },
      path,
      categories.length,
    );
    setActive(categories.length);
  };

  if (categories.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <DropSlot parentPath={path} index={0} />
        {!readonly && (
          <button
            type="button"
            onClick={onAdd}
            data-cy={`add-category-${path.join(".")}`}
            className="rounded border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-bcgov-blue hover:text-bcgov-blue"
          >
            + Category
          </button>
        )}
      </div>
    );
  }

  return (
    <Tabs
      value={safeActive}
      onValueChange={(v) => setActive(Number(v))}
    >
      <div className="flex items-center gap-2">
        <TabsList>
          {categories.map((cat, i) => (
            <TabsTrigger
              key={i}
              value={i}
              onClick={(e) => {
                e.stopPropagation();
                setActive(i);
                select([...path, i]);
              }}
            >
              {(cat as { label?: string }).label ?? `Category ${i + 1}`}
            </TabsTrigger>
          ))}
        </TabsList>
        {!readonly && (
          <button
            type="button"
            onClick={onAdd}
            data-cy={`add-category-${path.join(".")}`}
            className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-bcgov-blue hover:text-bcgov-blue"
            title="Add category"
          >
            +
          </button>
        )}
      </div>
      {categories.map((cat, i) => {
        const catPath = [...path, i];
        return (
          <TabsContent key={i} value={i}>
            <CanvasPathContext.Provider value={catPath}>
              <ChromeElement
                uischema={cat}
                schema={schema}
                path={dispatchProps.path}
                enabled={dispatchProps.enabled}
                renderers={dispatchProps.renderers}
                cells={dispatchProps.cells}
              />
            </CanvasPathContext.Provider>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function ChromeElement(props: DispatchProps) {
  const path = useContext(CanvasPathContext);
  const { uischema, schema } = props;
  const type = (uischema as { type?: string }).type ?? "Unknown";
  const scope = (uischema as { scope?: string }).scope;
  const elements = (uischema as { elements?: UISchemaElement[] }).elements;

  const typeLabel =
    type === "Control" && scope ? `Control: ${scope.split("/").pop()}` : type;

  if (type === "Categorization") {
    const cats = Array.isArray(elements) ? elements : [];
    return (
      <ChromeWrapper path={path} typeLabel={typeLabel}>
        <div className="p-2">
          <CategorizationChrome
            path={path}
            categories={cats}
            schema={schema}
            dispatchProps={props}
          />
        </div>
      </ChromeWrapper>
    );
  }

  if (LAYOUT_TYPES.has(type)) {
    const els = Array.isArray(elements) ? elements : [];
    const direction = type === "HorizontalLayout" ? "row" : "col";
    const label = (uischema as { label?: string }).label;
    return (
      <ChromeWrapper path={path} typeLabel={typeLabel}>
        <div className="p-2">
          {label && (
            <div className="mb-2 text-sm font-medium text-foreground">
              {label}
            </div>
          )}
          <LayoutChildren
            path={path}
            elements={els}
            schema={schema}
            direction={direction}
            dispatchProps={props}
          />
        </div>
      </ChromeWrapper>
    );
  }

  // Leaf: delegate to next-best base renderer, wrapped in error boundary.
  return (
    <ChromeWrapper path={path} typeLabel={typeLabel}>
      <div className="pointer-events-none p-2">
        <RenderErrorBoundary
          fallback={
            <div className="rounded border border-destructive px-2 py-1 text-xs text-destructive">
              {typeLabel} (unresolved)
            </div>
          }
        >
          <DelegatedRender {...props} />
        </RenderErrorBoundary>
      </div>
    </ChromeWrapper>
  );
}

export const canvasChromeRenderer: JsonFormsRendererRegistryEntry = {
  tester: (() => Number.MAX_VALUE) as RankedTester,
  renderer: ChromeElement as unknown as JsonFormsRendererRegistryEntry["renderer"],
};
