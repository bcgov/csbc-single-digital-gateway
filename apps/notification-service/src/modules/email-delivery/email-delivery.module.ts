import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env.schema';
import { EmailWorkerService } from './services/email-worker.service';
import { EMAIL_SENDER, NodemailerSender, type EmailSender } from './services/mailer';

@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): EmailSender =>
        new NodemailerSender(
          config.get('SMTP_URL', { infer: true }),
          config.get('MAIL_FROM', { infer: true }),
        ),
    },
    EmailWorkerService,
  ],
  exports: [EmailWorkerService],
})
export class EmailDeliveryModule {}
