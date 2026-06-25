import { Module } from '@nestjs/common';
import { AdminDocumentTypesV1Controller } from './controllers/admin-document-types-v1.controller';
import { DocumentTypesV1Controller } from './controllers/document-types-v1.controller';
import { DocumentTypeVersionsService } from './services/document-type-versions.service';
import { DocumentTypesService } from './services/document-types.service';

@Module({
  controllers: [AdminDocumentTypesV1Controller, DocumentTypesV1Controller],
  providers: [DocumentTypesService, DocumentTypeVersionsService],
})
export class DocumentTypesModule {}
