import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { ConsentDocumentTypesAdminV1Controller } from './controllers/consent-document-types-admin-v1.controller';
import { ConsentDocumentsAdminV1Controller } from './controllers/consent-documents-admin-v1.controller';
import { ConsentDocumentContributorGuard } from './guards/consent-document-contributor.guard';
import { ConsentDocumentContributorsService } from './services/consent-document-contributors.service';
import { ConsentDocumentTypesService } from './services/consent-document-types.service';
import { ConsentDocumentsService } from './services/consent-documents.service';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [
    ConsentDocumentTypesAdminV1Controller,
    ConsentDocumentsAdminV1Controller,
  ],
  providers: [
    ConsentDocumentTypesService,
    ConsentDocumentsService,
    ConsentDocumentContributorsService,
    ConsentDocumentContributorGuard,
  ],
})
export class ConsentModule {}
