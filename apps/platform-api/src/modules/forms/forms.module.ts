import { Module } from '@nestjs/common';
import { FormsV1Controller } from './controllers/forms-v1.controller';
import { FormsService } from './services/forms.service';

@Module({
  controllers: [FormsV1Controller],
  providers: [FormsService],
})
export class FormsModule {}
