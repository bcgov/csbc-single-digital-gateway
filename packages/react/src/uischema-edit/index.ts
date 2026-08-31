export type { EditOption, EditableSection, UiElement } from './types';
export {
  collectEditableSections,
  findEditableSection,
  readEditOption,
  slugify,
  stampEditIds,
} from './walk';
export { collectScopes, scopePath, scopedSchema } from './scoped-schema';
