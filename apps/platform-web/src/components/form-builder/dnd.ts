/**
 * Drag-and-drop id scheme + (de)serialization between the form model and the `@dnd-kit` sortable
 * "group record" used by the `move` helper. Pure + unit-tested so the dnd wiring stays thin.
 *
 * Sortable ids: a control is `f:<key>` (keys are unique across the whole form), a display node is
 * `d:<id>` (its persisted stable id), a container is `c:<rootIndex>`. Groups: the root list is
 * `ROOT_GROUP`; each container's children are `g:<index>`.
 */
import type { ControlNode, DisplayNode, FieldNode, FormModel } from './model';

export const ROOT_GROUP = 'root';
export const groupId = (containerIndex: number): string => `g:${containerIndex}`;
export const controlId = (key: string): string => `f:${key}`;
export const displayId = (id: string): string => `d:${id}`;
export const containerId = (index: number): string => `c:${index}`;

export type GroupRecord = Record<string, string[]>;

/** The sortable id for a control or display child (containers are addressed by index). */
const childId = (node: ControlNode | DisplayNode): string =>
  node.kind === 'control' ? controlId(node.key) : displayId(node.id);

/** Build the `{ root: [...ids], 'g:<i>': [...childIds] }` record for the `move` helper. */
export function buildRecord(model: FormModel): GroupRecord {
  const record: GroupRecord = { [ROOT_GROUP]: [] };
  model.fields.forEach((field, i) => {
    if (field.kind === 'container') {
      record[ROOT_GROUP]?.push(containerId(i));
      record[groupId(i)] = field.children.map(childId);
    } else {
      record[ROOT_GROUP]?.push(childId(field));
    }
  });
  return record;
}

/** Rebuild the model from a (post-`move`) record, resolving ids back to nodes in `model`. */
export function applyRecord(model: FormModel, record: GroupRecord): FormModel {
  const byId = new Map<string, ControlNode | DisplayNode>();
  const index = (node: ControlNode | DisplayNode) => byId.set(childId(node), node);
  for (const field of model.fields) {
    if (field.kind === 'container') {
      field.children.forEach(index);
    } else {
      index(field);
    }
  }
  const resolveChild = (id: string): ControlNode | DisplayNode | undefined =>
    id.startsWith('f:') || id.startsWith('d:') ? byId.get(id) : undefined;

  const fields: FieldNode[] = [];
  for (const id of record[ROOT_GROUP] ?? []) {
    if (id.startsWith('c:')) {
      const ci = Number(id.slice(2));
      const container = model.fields[ci];
      if (container === undefined || container.kind !== 'container') {
        continue;
      }
      const children = (record[groupId(ci)] ?? [])
        .map(resolveChild)
        .filter((c): c is ControlNode | DisplayNode => c !== undefined);
      fields.push({ ...container, children });
    } else {
      const child = resolveChild(id);
      if (child !== undefined) {
        fields.push(child);
      }
    }
  }
  return { ...model, fields };
}
