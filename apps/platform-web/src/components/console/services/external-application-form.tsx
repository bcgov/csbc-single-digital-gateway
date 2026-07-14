import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { useId, useState } from 'react';

export interface ExternalApplicationValues {
  label: string;
  url: string;
}

/** Whether a string is a valid absolute https URL — mirrors the server's https-only rule (feature
 * 131), so obviously-invalid input is caught before the request. The server is authoritative. */
export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Shared label + url form for creating/editing an external application method. Used by the "New
 * application method" modal (External link) and the edit dialog in the methods list.
 */
export function ExternalApplicationForm({
  initial,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: ExternalApplicationValues;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (values: ExternalApplicationValues) => void;
  onCancel: () => void;
}) {
  const labelId = useId();
  const urlId = useId();
  const [label, setLabel] = useState(initial?.label ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [touched, setTouched] = useState(false);

  const trimmedLabel = label.trim();
  const trimmedUrl = url.trim();
  const urlValid = isHttpsUrl(trimmedUrl);
  const urlError = touched && trimmedUrl.length > 0 && !urlValid;
  const canSubmit = trimmedLabel.length > 0 && urlValid && !submitting;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (canSubmit) {
          onSubmit({ label: trimmedLabel, url: trimmedUrl });
        }
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={labelId}>Label</Label>
        <Input
          id={labelId}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Apply on GOV.UK"
          maxLength={255}
          disabled={submitting}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={urlId}>Link URL</Label>
        <Input
          id={urlId}
          type="url"
          inputMode="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="https://example.gov"
          disabled={submitting}
          aria-invalid={urlError}
        />
        {urlError ? (
          <p className="text-xs text-destructive">Enter a valid https:// address.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Applicants open this link in a new tab.</p>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
