import type { StudioPath } from "../model/types.js";

const DROP_PREFIX = "drop:";
const NODE_DRAG_PREFIX = "node:";

export function nodeDragIdFor(path: StudioPath): string {
  return `${NODE_DRAG_PREFIX}${path.join(".")}`;
}

export function parseNodeDragId(id: string): StudioPath | null {
  if (!id.startsWith(NODE_DRAG_PREFIX)) return null;
  const rest = id.slice(NODE_DRAG_PREFIX.length);
  if (rest === "") return [];
  return rest.split(".").map(Number);
}

export function isSelfOrDescendant(
  source: StudioPath,
  target: StudioPath,
): boolean {
  if (target.length < source.length) return false;
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== target[i]) return false;
  }
  return true;
}

export function dropIdFor(parentPath: StudioPath, index: number): string {
  return `${DROP_PREFIX}${parentPath.join(".")}@${index}`;
}

export function parseDropId(
  id: string,
): { parentPath: StudioPath; index: number } | null {
  if (!id.startsWith(DROP_PREFIX)) return null;
  const rest = id.slice(DROP_PREFIX.length);
  const at = rest.lastIndexOf("@");
  if (at === -1) return null;
  const path = rest.slice(0, at);
  const index = Number(rest.slice(at + 1));
  if (Number.isNaN(index)) return null;
  return {
    parentPath: path === "" ? [] : path.split(".").map(Number),
    index,
  };
}
