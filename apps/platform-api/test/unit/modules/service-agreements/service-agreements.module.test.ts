import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { ServiceAgreementsModule } from '../../../../src/modules/service-agreements/service-agreements.module';
import { ServiceAgreementsV1Controller } from '../../../../src/modules/service-agreements/controllers/service-agreements-v1.controller';
import { ServiceAgreementsService } from '../../../../src/modules/service-agreements/services/service-agreements.service';
import { ServiceAgreementTypeResolver } from '../../../../src/modules/service-agreements/services/service-agreement-type.resolver';
import { InjectDatabase } from '@repo/nestjs/database';

describe('ServiceAgreementsModule', () => {
  it('should compile successfully', async () => {
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
    expect(moduleRef.get(ServiceAgreementTypeResolver)).toBeInstanceOf(
      ServiceAgreementTypeResolver,
    );
  });
});
