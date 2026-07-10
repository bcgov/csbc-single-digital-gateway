import { Module } from '@nestjs/common';

import { OutboxRelayService } from './outbox-relay.service';

@Module({
  providers: [OutboxRelayService],
  exports: [OutboxRelayService],
})
export class OutboxRelayModule {}
