import Editor from '@monaco-editor/react';

interface DefinitionEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

/** A Monaco JSON editor for a version's `definition`. Read-only for published/archived versions. */
export function DefinitionEditor({ value, onChange, readOnly = false }: DefinitionEditorProps) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-border"
      data-testid="definition-editor"
    >
      <Editor
        height="360px"
        defaultLanguage="json"
        value={value}
        onChange={(next) => onChange?.(next ?? '')}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          tabSize: 2,
        }}
      />
    </div>
  );
}
