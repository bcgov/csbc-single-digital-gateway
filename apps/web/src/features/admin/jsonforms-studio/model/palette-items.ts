import type {
  FieldType,
  LayoutType,
  PaletteItem,
  RendererKey,
} from "./types.js";

export interface PaletteSection {
  id: string;
  title: string;
  items: PaletteEntry[];
}

export interface PaletteEntry {
  id: string;
  label: string;
  description?: string;
  item: PaletteItem;
}

const LAYOUTS: { type: LayoutType; label: string }[] = [
  { type: "VerticalLayout", label: "Vertical" },
  { type: "HorizontalLayout", label: "Horizontal" },
  { type: "Group", label: "Group" },
  { type: "Categorization", label: "Categorization" },
  { type: "Category", label: "Category" },
];

const NEW_FIELDS: { type: FieldType; label: string }[] = [
  { type: "string", label: "Text" },
  { type: "multiline", label: "Multi-line text" },
  { type: "richtext", label: "Rich text" },
  { type: "number", label: "Number" },
  { type: "integer", label: "Integer" },
  { type: "boolean", label: "Boolean" },
  { type: "date", label: "Date" },
  { type: "enum", label: "Enum" },
  { type: "json", label: "JSON object" },
  { type: "objectArray", label: "Object array" },
  { type: "faqArray", label: "FAQ" },
];

const CUSTOM_RENDERERS: { key: RendererKey; label: string }[] = [
  { key: "richtext", label: "Rich text" },
  { key: "asyncSelect", label: "Async select" },
  { key: "select", label: "Select" },
  { key: "json", label: "JSON editor" },
  { key: "multiline", label: "Multi-line" },
];

export function buildPaletteSections(
  schemaProperties: string[],
): PaletteSection[] {
  return [
    {
      id: "layouts",
      title: "Layouts",
      items: LAYOUTS.map((l) => ({
        id: `layout-${l.type}`,
        label: l.label,
        item: { kind: "layout", layoutType: l.type },
      })),
    },
    {
      id: "new-field",
      title: "New field",
      items: NEW_FIELDS.map((f) => ({
        id: `field-${f.type}`,
        label: f.label,
        item: { kind: "new-field", fieldType: f.type },
      })),
    },
    {
      id: "bound",
      title: "Bound controls",
      items: schemaProperties.map((p) => ({
        id: `bound-${p}`,
        label: p,
        item: { kind: "bound-control", propertyPath: p },
      })),
    },
    {
      id: "custom",
      title: "Custom renderers",
      items: CUSTOM_RENDERERS.map((r) => ({
        id: `custom-${r.key}`,
        label: r.label,
        item: { kind: "custom-renderer", rendererKey: r.key },
      })),
    },
  ];
}
