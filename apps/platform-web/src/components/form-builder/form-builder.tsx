import { move } from '@dnd-kit/helpers';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { Suspense, lazy, useMemo, useState, type ReactNode } from 'react';
import { Canvas } from './canvas';
import { applyRecord, buildRecord } from './dnd';
import { FieldPreview, previewNodeForType } from './field-card';
import { type FieldTypeId } from './field-types';
import { Inspector } from './inspector';
import {
  type ContainerNode,
  type ControlNode,
  type FieldNode,
  type FormDefinition,
  type FormModel,
  type Path,
  allKeys,
  createField,
  getNodeAt,
  insertField,
  moveField,
  parseModel,
  serializeModel,
  uniqueKey,
} from './model';
import { Palette } from './palette';

const Preview = lazy(() => import('./preview'));

/**
 * Controlled form builder over a JSONForms definition (`{ schema, uischema }`).
 * Palette (left) → Canvas (center) → Inspector (right). The in-browser model is the source of
 * truth; every edit re-serializes and calls `onChange`. Standard `@dnd-kit` reflow drives drag:
 * the list slides open a gap where the item will land. Reorder/cross-container is committed via the
 * `move` helper (matches the preview); palette + empty-list drops use the pure model ops.
 */
export function FormBuilder({
  value,
  onChange,
  title,
  actions,
}: {
  value: FormDefinition;
  onChange: (value: FormDefinition) => void;
  /** Optional left-aligned toolbar content (e.g. the page heading). */
  title?: ReactNode;
  /** Optional right-aligned toolbar content rendered after the Build/Preview toggle (e.g. Save). */
  actions?: ReactNode;
}) {
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [tab, setTab] = useState<'build' | 'preview'>('build');
  // The field type of an in-flight PALETTE drag (else null) → the canvas renders a realistic drop
  // placeholder for it (palette items are plain draggables, so the list won't reflow for them).
  const [paletteDragType, setPaletteDragType] = useState<FieldTypeId | null>(null);
  const model = useMemo(() => parseModel(value), [value]);
  const emit = (next: FormModel) => onChange(serializeModel(next));
  const selected = getNodeAt(model, selectedPath);

  const addField = (fieldType: FieldTypeId) => {
    const node = createField(fieldType);
    const target = selectedPath !== null ? model.fields[selectedPath[0] as number] : undefined;
    if (node.kind === 'control') {
      node.key = uniqueKey(fieldType, allKeys(model));
      if (target !== undefined && target.kind === 'container') {
        emit(
          insertField(model, node, {
            container: selectedPath![0] as number,
            index: target.children.length,
          }),
        );
        return;
      }
    }
    emit(insertField(model, node, { container: null, index: model.fields.length }));
  };

  const replaceAt = (path: Path, updater: (node: FieldNode) => FieldNode) => {
    const fields = model.fields.map((f) =>
      f.kind === 'container' ? { ...f, children: [...f.children] } : f,
    );
    const top = fields[path[0] as number];
    if (top === undefined) {
      return;
    }
    if (path.length === 1) {
      fields[path[0] as number] = updater(top);
    } else if (top.kind === 'container') {
      const child = top.children[path[1] as number];
      if (child === undefined) {
        return;
      }
      top.children[path[1] as number] = updater(child) as ControlNode;
    }
    emit({ ...model, fields });
  };

  return (
    <DragDropProvider
      onDragStart={(event) => {
        const source = event.operation.source;
        setPaletteDragType(
          source?.type === 'palette-item' ? (source.data.fieldType as FieldTypeId) : null,
        );
      }}
      onDragEnd={(event) => {
        setPaletteDragType(null);
        const { source, target } = event.operation;
        if (source === null || target === null) {
          return;
        }
        const data = target.data as { container?: number | null; index?: number };
        // Palette → insert a new field at the hovered target (or append if the target has no index).
        if (source.type === 'palette-item') {
          const node = createField(source.data.fieldType as FieldTypeId);
          if (node.kind === 'control') {
            node.key = uniqueKey(source.data.fieldType as FieldTypeId, allKeys(model));
          }
          const at =
            typeof data.index === 'number'
              ? { container: data.container ?? null, index: data.index }
              : { container: null, index: model.fields.length };
          emit(insertField(model, node, at));
          return;
        }
        // Existing field dropped onto an EMPTY-list zone (reflow can't preview that) → moveField.
        if (target.type === 'zone') {
          const from = source.data.path as Path | undefined;
          if (from !== undefined && typeof data.index === 'number') {
            emit(moveField(model, from, { container: data.container ?? null, index: data.index }));
          }
          return;
        }
        // Item → item: let `move` compute the new order (matches the live reflow preview).
        emit(applyRecord(model, move(buildRecord(model), event)));
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <div className="min-w-0">{title}</div>
          <div className="flex items-center gap-3">
            <Tabs value={tab} onValueChange={(next) => setTab(next as 'build' | 'preview')}>
              <TabsList>
                <TabsTrigger value="build">Build</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </Tabs>
            {actions}
          </div>
        </div>
        {tab === 'preview' ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/10">
            <Suspense
              fallback={<p className="p-6 text-sm text-muted-foreground">Loading preview…</p>}
            >
              <Preview definition={serializeModel(model)} />
            </Suspense>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[16rem_1fr_20rem]">
            <Palette onAdd={addField} />
            <Canvas
              model={model}
              selectedPath={selectedPath}
              paletteDragType={paletteDragType}
              onSelect={setSelectedPath}
              onDelete={(path) => {
                emit(deleteAt(model, path));
                setSelectedPath(null);
              }}
              onChangeForm={(patch) => emit({ ...model, ...patch })}
            />
            <Inspector
              node={selected}
              allKeys={allKeys(model)}
              form={{ title: model.title, description: model.description }}
              onChangeControl={(patch) =>
                selectedPath !== null &&
                replaceAt(selectedPath, (node) => ({ ...(node as ControlNode), ...patch }))
              }
              onChangeContainer={(patch) =>
                selectedPath !== null &&
                replaceAt(selectedPath, (node) => ({ ...(node as ContainerNode), ...patch }))
              }
              onChangeForm={(patch) => emit({ ...model, ...patch })}
            />
          </div>
        )}
      </div>
      {/* Cursor preview: render the dragged item as its REAL field control (palette → a default node
          for its type; reorder → the moved node), so it "becomes" the rendered field while dragging.
          `dropAnimation={null}` disables the default snap-back-to-source on release. */}
      <DragOverlay dropAnimation={null}>
        {(source) => {
          const d = source.data as { node?: FieldNode; fieldType?: FieldTypeId };
          const node =
            d.node ?? (typeof d.fieldType === 'string' ? previewNodeForType(d.fieldType) : null);
          return node ? (
            <div className="w-80 rounded-lg border border-primary bg-card p-3 shadow-lg">
              <FieldPreview node={node} />
            </div>
          ) : null;
        }}
      </DragOverlay>
    </DragDropProvider>
  );
}

/** Remove the node at `path` (top-level or nested child). */
function deleteAt(model: FormModel, path: Path): FormModel {
  const fields = model.fields.map((f) =>
    f.kind === 'container' ? { ...f, children: [...f.children] } : f,
  );
  const top = fields[path[0] as number];
  if (top === undefined) {
    return model;
  }
  if (path.length === 1) {
    fields.splice(path[0] as number, 1);
  } else if (top.kind === 'container') {
    top.children.splice(path[1] as number, 1);
  }
  return { ...model, fields };
}
