import { CopyButton } from '@/components/dev/copy-button';

/** Preformatted code sample. Pass `label` to show a copy button (omit for non-code content, e.g. a composition tree). */
export function CodeBlock({
  code,
  label,
  className,
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  const trimmed = code.trim();
  return (
    <div className={`relative${className ? ` ${className}` : ''}`}>
      <pre className="bg-muted rounded-md p-4 pr-12 text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">
        <code>{trimmed}</code>
      </pre>
      {label ? (
        <div className="absolute top-2 right-2">
          <CopyButton text={trimmed} label={label} />
        </div>
      ) : null}
    </div>
  );
}
