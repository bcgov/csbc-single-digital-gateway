import { render } from '@react-email/render';

import { NotificationEmail, type NotificationEmailProps } from './emails/notification-email';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Render the generic notification email to a multipart-ready pair (HTML + plain text).
 * Pure: no env reads, no I/O — callers own transport. `subject` is the notification title.
 */
export async function renderNotificationEmail(
  props: NotificationEmailProps,
): Promise<RenderedEmail> {
  const element = NotificationEmail(props);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: props.title, html, text };
}
