import { createTransport, type Transporter } from 'nodemailer';

/** What the worker hands the transport — already rendered, multipart-ready. */
export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Transport port. Production is {@link NodemailerSender} over SMTP_URL; tests inject a stub
 * under this token so no SMTP server runs in the suite.
 */
export interface EmailSender {
  send(email: OutgoingEmail): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export class NodemailerSender implements EmailSender {
  private readonly transporter: Transporter;

  constructor(
    smtpUrl: string,
    private readonly from: string,
  ) {
    this.transporter = createTransport(smtpUrl);
  }

  async send(email: OutgoingEmail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }
}
