import { describe, expect, it } from 'vitest';

import { renderNotificationEmail } from '../src/render';

describe('renderNotificationEmail', () => {
  it('renders HTML and plain text containing the title and body, subject = title', async () => {
    const { subject, html, text } = await renderNotificationEmail({
      title: 'Your application was approved',
      body: 'Sign in to view the decision details.',
    });
    expect(subject).toBe('Your application was approved');
    expect(html).toContain('Your application was approved');
    expect(html).toContain('Sign in to view the decision details.');
    expect(html).toContain('<html');
    // The plain-text renderer uppercases headings (html-to-text convention) — match loosely.
    expect(text.toLowerCase()).toContain('your application was approved');
    expect(text).toContain('Sign in to view the decision details.');
    expect(text).not.toContain('<html');
  });

  it('renders an action button + the raw URL in text when actionUrl is provided', async () => {
    const { html, text } = await renderNotificationEmail({
      title: 'Your application was approved',
      body: 'See the decision.',
      actionUrl: 'https://portal.example.com/applications/abc-123',
      actionLabel: 'View application',
    });
    expect(html).toContain('https://portal.example.com/applications/abc-123');
    expect(html).toContain('View application');
    expect(text).toContain('https://portal.example.com/applications/abc-123');
  });

  it('renders no action affordance when actionUrl is absent (unchanged output)', async () => {
    const { html } = await renderNotificationEmail({ title: 'Plain' });
    expect(html).not.toContain('View details');
  });

  it('renders without a body', async () => {
    const { html } = await renderNotificationEmail({ title: 'Title only' });
    expect(html).toContain('Title only');
  });

  it('escapes markup in producer content (no HTML injection via title/body)', async () => {
    const { html } = await renderNotificationEmail({
      title: '<script>alert(1)</script>',
      body: '<img src=x onerror=alert(2)>',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
  });
});
