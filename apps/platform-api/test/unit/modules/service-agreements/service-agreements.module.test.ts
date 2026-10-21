import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { ServiceAgreementsModule } from '../../../../src/modules/service-agreements/service-agreements.module';
import { ServiceAgreementsV1Controller } from '../../../../src/modules/service-agreements/controllers/service-agreements-v1.controller';
import { TemplateResolver } from '../../../../src/modules/templates/services/template.resolver';
import { ServiceAgreementsService } from '../../../../src/modules/service-agreements/services/service-agreements.service';
import { InjectDatabase } from '@repo/nestjs/database';

describe('ServiceAgreementsModule', () => {
  it('Should compile successfully for ServiceAgreementsModule', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ServiceAgreementsModule],
    })
      .useMocker((token) => {
        if (token === InjectDatabase() || token === 'Database') {
          return {};
        }
        return {};
      })
      .compile();

    expect(moduleRef).toBeDefined();
    expect(moduleRef.get(ServiceAgreementsV1Controller)).toBeInstanceOf(
      ServiceAgreementsV1Controller,
    );
    expect(moduleRef.get(ServiceAgreementsService)).toBeInstanceOf(ServiceAgreementsService);
    // Feature 217: the per-type resolver became the shared TemplateResolver, provided by the
    // imported TemplatesModule rather than by this module.
    expect(moduleRef.get(TemplateResolver)).toBeInstanceOf(TemplateResolver);
  });
});
