import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConsentProxyController } from './controllers/consent-proxy.controller';

@Module({
  imports: [HttpModule],
  controllers: [ConsentProxyController],
})
export class ConsentProxyModule {}
