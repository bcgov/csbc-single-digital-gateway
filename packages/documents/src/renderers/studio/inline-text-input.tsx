import { useEffect, useRef, useState } from 'react';
import { STUDIO_INTERACTIVE } from './studio-element';

/**
 * Text edited in place on the canvas (doc 263 rule 21, generalised by doc 265 rule 6): a local draft that commits its
 * trimmed, CHANGED value on blur or Enter; Escape restores. A blank commit is refused (restored) unless `allowBlank`.
 * It follows a changed `value` only while it does not have focus, so the author's typing is never reset.
 */
export function InlineTextInput({
  value,
  label,
  onCommit,
  allowBlank = false,
  placeholder,
  className = 'font-medium',
}: {
  value: string;
  label: string;
  onCommit: (value: string) => void;
  allowBlank?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const input = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);
  useEffect(() => {
    if (document.activeElement !== input.current) setDraft(value);
  }, [value]);
  const commit = () => {
    const next = draft.trim();
    if (cancelled.current || (next === '' && !allowBlank) || next === value) setDraft(value);
    else onCommit(next);
    cancelled.current = false;
  };
  return (
    <input
      ref={input}
      aria-label={label}
      value={draft}
      placeholder={placeholder}
      size={Math.max(draft.length, placeholder?.length ?? 0, 4)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') input.current?.blur();
        if (event.key === 'Escape') {
          cancelled.current = true;
          input.current?.blur();
        }
      }}
      className={`${STUDIO_INTERACTIVE} min-w-0 rounded-sm bg-transparent px-1 py-0.5 outline-none placeholder:text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    />
  );
}
