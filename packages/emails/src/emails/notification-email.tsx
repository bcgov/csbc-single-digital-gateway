import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export interface NotificationEmailProps {
  /** Notification title — also the email subject. */
  title: string;
  /** Optional plain-text body (never interpreted as markup — React escapes it). */
  body?: string | undefined;
  /**
   * Optional deep link to the notification's object (feature 127). MUST be an absolute
   * http(s) URL to a trusted, producer-configured origin — callers validate before passing.
   */
  actionUrl?: string | undefined;
  /** Button text for the action link (e.g. "View application"). */
  actionLabel?: string | undefined;
}

const styles = {
  body: { backgroundColor: '#f4f4f5', fontFamily: 'Helvetica, Arial, sans-serif' },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '40px auto',
    maxWidth: '560px',
    padding: '32px',
  },
  heading: { color: '#18181b', fontSize: '20px', lineHeight: '28px', margin: '0 0 16px' },
  text: { color: '#3f3f46', fontSize: '14px', lineHeight: '22px', margin: '0' },
  button: {
    backgroundColor: '#1e40af',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: 600,
    marginTop: '20px',
    padding: '10px 18px',
    textDecoration: 'none',
  },
  hr: { borderColor: '#e4e4e7', margin: '24px 0 16px' },
  footer: { color: '#a1a1aa', fontSize: '12px', lineHeight: '18px', margin: '0' },
} as const;

/**
 * The generic notification email. Deliberately minimal — the future email-builder renders
 * staff-authored templates; this is the default every notification falls back to.
 */
export function NotificationEmail({
  title,
  body,
  actionUrl,
  actionLabel,
}: NotificationEmailProps): React.JSX.Element {
  return (
    <Html lang="en">
      <Head />
      <Preview>{title}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section>
            <Heading as="h1" style={styles.heading}>
              {title}
            </Heading>
            {body !== undefined && body !== '' ? <Text style={styles.text}>{body}</Text> : null}
            {actionUrl !== undefined && actionUrl !== '' ? (
              <Button href={actionUrl} style={styles.button}>
                {actionLabel ?? 'View details'}
              </Button>
            ) : null}
            <Hr style={styles.hr} />
            <Text style={styles.footer}>
              You received this because notifications by email are enabled in your preferences.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
