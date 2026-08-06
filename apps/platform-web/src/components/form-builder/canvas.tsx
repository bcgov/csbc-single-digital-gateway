import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Textarea } from '@repo/ui/textarea';
import { ROOT_GROUP } from './dnd';
import { ContainerRow, EmptyDropZone, EndZone, FieldRow, pathEq } from './field-rows';
import type { FieldTypeId } from './field-types';
import type { DisplayNode, FieldNode, FormModel, Path } from './model';

/** Center column: the form preview-as-editor — editable title/description + the draggable fields. */
export function Canvas({
  model,
  selectedPath,
  paletteDragType,
  onSelect,
  onDelete,
  onChangeDisplay,
  onChangeForm,
}: {
  model: FormModel;
  selectedPath: Path | null;
  paletteDragType: FieldTypeId | null;
  onSelect: (path: Path | null) => void;
  onDelete: (path: Path) => void;
  onChangeDisplay: (path: Path, patch: Partial<DisplayNode>) => void;
  onChangeForm: (patch: Partial<Pick<FormModel, 'title' | 'description'>>) => void;
}) {
  const renderField = (field: FieldNode, index: number) =>
    field.kind === 'container' ? (
      <ContainerRow
        key={`container-${index}`}
        node={field}
        index={index}
        selectedPath={selectedPath}
        paletteDragType={paletteDragType}
        onSelect={onSelect}
        onDelete={onDelete}
        onChangeDisplay={onChangeDisplay}
      />
    ) : (
      <FieldRow
        key={field.kind === 'control' ? field.key || index : field.id}
        node={field}
        index={index}
        group={ROOT_GROUP}
        path={[index]}
        selected={pathEq(selectedPath, [index])}
        paletteDragType={paletteDragType}
        onSelect={onSelect}
        onDelete={onDelete}
        onChangeDisplay={onChangeDisplay}
      />
    );

  return (
    <section
      aria-label="Canvas"
      className="flex h-full flex-col gap-4 overflow-y-auto bg-muted/10 p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onSelect(null);
        }
      }}
    >
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="canvas-form-title">Title</Label>
          <Input
            id="canvas-form-title"
            placeholder="Untitled"
            value={model.title}
            aria-invalid={model.title.trim() === '' || undefined}
            onChange={(event) => onChangeForm({ title: event.target.value })}
            onFocus={() => onSelect(null)}
          />
          {model.title.trim() === '' ? (
            <p className="text-xs text-destructive">A title is required.</p>
          ) : null}
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          <Label htmlFor="canvas-form-description">Description</Label>
          <Textarea
            id="canvas-form-description"
            placeholder="Add a description for applicants"
            value={model.description}
            onChange={(event) => onChangeForm({ description: event.target.value })}
            rows={3}
            onFocus={() => onSelect(null)}
          />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {model.fields.length === 0 ? (
            <EmptyDropZone
              id="zone-root"
              container={null}
              accept={['field', 'container', 'palette-item']}
            />
          ) : (
            <>
              {model.fields.map(renderField)}
              <EndZone
                id="zone-root-end"
                container={null}
                index={model.fields.length}
                accept={['field', 'container', 'palette-item']}
                paletteDragType={paletteDragType}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
