import type { UpdatePreferencesInput } from '../dtos/preferences.dtos';

/** The recipient's CURRENT stored contact email + whether the email channel is currently enabled. */
export interface CurrentEmailState {
  email: string | null;
  emailEnabled: boolean;
}

/**
 * Whether applying `input` would leave email notifications ENABLED with no contact email — the
 * invariant the service rejects with 422 (feature 138: server-side mirror of the form's client
 * gate). `input.email`/`input.channels` are PARTIAL (absent = unchanged), so this resolves the
 * post-update (merged) state, not the raw request body: the email channel's resulting enabled flag
 * (the `email` toggle if present, else the current stored value) and the resulting address (the
 * `input.email` if present — including a deliberate `null` clear — else the current stored email).
 */
export function emailContactMissing(
  input: UpdatePreferencesInput,
  current: CurrentEmailState,
): boolean {
  const emailToggle = input.channels?.find((c) => c.channel === 'email');
  const emailEnabledAfter = emailToggle !== undefined ? emailToggle.enabled : current.emailEnabled;
  const emailAfter = input.email !== undefined ? input.email : current.email;
  return emailEnabledAfter && (emailAfter === null || emailAfter.trim() === '');
}
