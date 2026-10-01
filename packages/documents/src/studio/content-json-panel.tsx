import type { DocumentContent } from './document-types';

/** A floating, read-only view of the document's content as pretty-printed JSON — a spike debugging aid. */
export function ContentJsonPanel({ content }: { content: DocumentContent }) {
  return (
    <section
      aria-label="Content JSON"
      data-slot="document-studio-json-panel"
      className="absolute top-3 right-3 z-10 flex max-h-[calc(100%-1.5rem)] w-80 flex-col overflow-hidden rounded-md border border-border bg-background shadow-md"
    >
      <h2 className="shrink-0 border-b border-border px-3 py-1.5 text-xs font-medium">Content</h2>
      <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs">
        {JSON.stringify(content, null, 2)}
      </pre>
    </section>
  );
}
