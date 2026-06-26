import { Input } from '@repo/ui/input';
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
        <Input
          aria-label="Form title"
          placeholder="Untitled form"
          value={model.title}
          onChange={(event) => onChangeForm({ title: event.target.value })}
          className="border-0 px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
        />
        <Textarea
          aria-label="Form description"
          placeholder="Add a description for applicants"
          value={model.description}
          onChange={(event) => onChangeForm({ description: event.target.value })}
          className="mt-1 resize-none border-0 px-0 shadow-none focus-visible:ring-0"
          rows={2}
        />
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
