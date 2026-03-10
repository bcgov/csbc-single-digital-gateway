import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConsentProxyController } from './consent-proxy.controller';

@Module({
  imports: [HttpModule],
  controllers: [ConsentProxyController],
})
export class ConsentProxyModule {}
