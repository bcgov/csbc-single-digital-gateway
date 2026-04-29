import type { AsyncSelectProps } from "@repo/ui";

export interface AsyncSelectUrlMapping {
  results?: string;
  value?: string;
  label?: string;
}

export interface AsyncSelectUrlLoader {
  loadOptions: AsyncSelectProps["loadOptions"];
  resolveValue: AsyncSelectProps["resolveValue"];
}

interface OptionRow {
  value: string;
  label: string;
}

const DEFAULT_RESULTS_KEYS = ["docs", "items", "data", "results"];

function walkPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const segments = path.split(".");
  let cursor: unknown = obj;
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function extractRows(payload: unknown, resultsPath?: string): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (resultsPath) {
    const located = walkPath(payload, resultsPath);
    if (Array.isArray(located)) return located;
  }
  if (payload && typeof payload === "object") {
    for (const key of DEFAULT_RESULTS_KEYS) {
      const candidate = (payload as Record<string, unknown>)[key];
      if (Array.isArray(candidate)) return candidate;
    }
  }
  return [];
}

function mapRow(
  row: unknown,
  valueKey: string,
  labelKey: string,
): OptionRow | null {
  if (!row || typeof row !== "object") return null;
  const rec = row as Record<string, unknown>;
  const value = rec[valueKey];
  const label = rec[labelKey];
  if (value === undefined || value === null) return null;
  return {
    value: String(value),
    label: label == null ? String(value) : String(label),
  };
}

/**
 * Build an ad-hoc AsyncSelect loader that fetches options from a URL.
 *
 * Uses the browser `fetch` API directly. Intended for public or same-origin
 * endpoints the form is allowed to hit — no auth headers are injected and no
 * retries are attempted.
 */
export function buildUrlAsyncLoader(
  url: string,
  mapping?: AsyncSelectUrlMapping,
): AsyncSelectUrlLoader {
  const valueKey = mapping?.value || "id";
  const labelKey = mapping?.label || "name";
  const resultsPath = mapping?.results;

  const loadOptions: AsyncSelectProps["loadOptions"] = async (
    search,
    _loaded,
    additional,
  ) => {
    const target = new URL(url, window.location.origin);
    if (search) target.searchParams.set("search", search);
    const page = (additional as { page?: number } | undefined)?.page;
    if (typeof page === "number") target.searchParams.set("page", String(page));
    const res = await fetch(target.toString(), {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { options: [], hasMore: false, additional };
    }
    const payload = (await res.json()) as unknown;
    const rows = extractRows(payload, resultsPath);
    const options = rows
      .map((row) => mapRow(row, valueKey, labelKey))
      .filter((opt): opt is OptionRow => opt !== null);
    return { options, hasMore: false, additional };
  };

  const resolveValue: AsyncSelectProps["resolveValue"] = async (value) => {
    if (value === undefined || value === null) return [];
    const ids = Array.isArray(value) ? value : [value];
    const results: OptionRow[] = [];
    for (const id of ids) {
      try {
        const target = new URL(`${url.replace(/\/$/, "")}/${encodeURIComponent(String(id))}`, window.location.origin);
        const res = await fetch(target.toString(), {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) continue;
        const payload = (await res.json()) as unknown;
        const row = payload && typeof payload === "object" && !Array.isArray(payload)
          ? mapRow(payload, valueKey, labelKey)
          : null;
        if (row) results.push(row);
      } catch {
        // swallow — best effort
      }
    }
    return results;
  };

  return { loadOptions, resolveValue };
}
