import { Module } from '@nestjs/common';
import { TemplatesModule } from '../templates/templates.module';
import { FormsV1Controller } from './controllers/forms-v1.controller';
import { FormsService } from './services/forms.service';

@Module({
  imports: [TemplatesModule],
  controllers: [FormsV1Controller],
  providers: [FormsService],
})
export class FormsModule {}
