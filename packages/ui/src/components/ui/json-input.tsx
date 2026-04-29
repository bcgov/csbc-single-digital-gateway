import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useRef } from "react";
import { cn } from "../../lib/utils";

export interface JsonInputProps {
  value: Record<string, unknown> | undefined;
  onChange: (value: Record<string, unknown> | undefined) => void;
  jsonSchema?: object;
  className?: string;
  disabled?: boolean;
  height?: string;
}

export function JsonInput({
  value,
  onChange,
  jsonSchema,
  className,
  disabled = false,
  height = "200px",
}: JsonInputProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      if (jsonSchema) {
        const model = editor.getModel();
        if (model) {
          const modelUri = model.uri.toString();
          const currentOptions =
            monaco.languages.json.jsonDefaults.diagnosticsOptions;
          const existingSchemas = currentOptions.schemas ?? [];
          const filtered = existingSchemas.filter(
            (s: { uri: string }) => s.uri !== modelUri,
          );
          monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            ...currentOptions,
            validate: true,
            schemas: [
              ...filtered,
              {
                uri: modelUri,
                fileMatch: [modelUri],
                schema: jsonSchema,
              },
            ],
          });
        }
      }
    },
    [jsonSchema],
  );

  const handleEditorChange = useCallback(
    (text: string | undefined) => {
      const trimmed = (text ?? "").trim();
      if (!trimmed) {
        onChange(undefined);
        return;
      }

      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          !Array.isArray(parsed)
        ) {
          onChange(parsed);
        }
      } catch {
        // Invalid JSON — don't propagate until user finishes typing
      }
    },
    [onChange],
  );

  return (
    <div
      className={cn(
        "border-input overflow-hidden rounded-md border",
        className,
      )}
    >
      <Editor
        height={height}
        defaultLanguage="json"
        defaultValue={value ? JSON.stringify(value, null, 2) : ""}
        onChange={handleEditorChange}
        onMount={handleMount}
        options={{
          minimap: { enabled: true },
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          fontSize: 13,
          tabSize: 2,
          readOnly: disabled,
          automaticLayout: true,
          wordWrap: "on",
        }}
      />
    </div>
  );
}
