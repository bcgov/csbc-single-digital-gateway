import { Input } from '@repo/ui/input';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ListSearchInputProps {
  /** URL-synced term (source of truth). Local edits debounce back out via `onChange`. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Debounce before emitting (ms). */
  delay?: number;
  className?: string;
}

/**
 * A debounced list search box (initiative `staff-list-query`). Holds local input state for instant
 * typing, emits the trimmed term after `delay` ms of idle, and stays in sync when `value` changes
 * from outside (URL / clear). Reused by every staff list surface.
 */
export function ListSearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  delay = 300,
  className,
}: ListSearchInputProps) {
  const [text, setText] = useState(value);
  // Keep the latest onChange without re-arming the debounce every render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Adopt external changes (URL navigation, clearing) that differ from local text.
  useEffect(() => {
    setText(value);
  }, [value]);

  // Debounce local edits back out; skip when already equal to the source of truth.
  useEffect(() => {
    if (text === value) return undefined;
    const id = setTimeout(() => onChangeRef.current(text), delay);
    return () => clearTimeout(id);
  }, [text, value, delay]);

  return (
    <div className={`relative ${className ?? 'w-64'}`}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className="px-7"
      />
      {text !== '' ? (
        <button
          type="button"
          onClick={() => {
            setText('');
            onChangeRef.current('');
          }}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
