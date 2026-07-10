export interface EmailAction {
  url: string;
  label: string;
}

/**
 * Extract the email deep-link from a notification payload (feature 127). Producers put an
 * ABSOLUTE http(s) URL to their own configured web origin in `payload.link` (+ optional
 * `payload.linkLabel`); anything else — absent, relative, non-http schemes, wrong types —
 * yields no action, never a send failure. Defense-in-depth on the trusted-producer contract:
 * nothing unvalidated ever becomes a clickable link in an email.
 */
export function emailActionFromPayload(
  payload: Record<string, unknown> | null | undefined,
): EmailAction | undefined {
  const link = payload?.['link'];
  if (typeof link !== 'string' || link === '') {
    return undefined;
  }
  let parsed: URL;
  try {
    parsed = new URL(link);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return undefined;
  }
  const label = payload?.['linkLabel'];
  return {
    url: link,
    label: typeof label === 'string' && label !== '' ? label : 'View details',
  };
}
