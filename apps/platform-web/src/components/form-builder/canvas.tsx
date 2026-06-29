import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Textarea } from '@repo/ui/textarea';
import { ROOT_GROUP } from './dnd';
import { ContainerRow, ControlRow, EmptyDropZone, EndZone, pathEq } from './field-rows';
import type { FieldTypeId } from './field-types';
import type { FieldNode, FormModel, Path } from './model';

/** Center column: the form preview-as-editor — editable title/description + the draggable fields. */
export function Canvas({
  model,
  selectedPath,
  paletteDragType,
  onSelect,
  onDelete,
  onChangeForm,
}: {
  model: FormModel;
  selectedPath: Path | null;
  paletteDragType: FieldTypeId | null;
  onSelect: (path: Path | null) => void;
  onDelete: (path: Path) => void;
  onChangeForm: (patch: Partial<Pick<FormModel, 'title' | 'description'>>) => void;
}) {
  const renderField = (field: FieldNode, index: number) =>
    field.kind === 'control' ? (
      <ControlRow
        key={field.key || index}
        node={field}
        index={index}
        group={ROOT_GROUP}
        path={[index]}
        selected={pathEq(selectedPath, [index])}
        paletteDragType={paletteDragType}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    ) : (
      <ContainerRow
        key={`container-${index}`}
        node={field}
        index={index}
        selectedPath={selectedPath}
        paletteDragType={paletteDragType}
        onSelect={onSelect}
        onDelete={onDelete}
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
            onChange={(event) => onChangeForm({ title: event.target.value })}
          />
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          <Label htmlFor="canvas-form-description">Description</Label>
          <Textarea
            id="canvas-form-description"
            placeholder="Add a description for applicants"
            value={model.description}
            onChange={(event) => onChangeForm({ description: event.target.value })}
            rows={3}
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
