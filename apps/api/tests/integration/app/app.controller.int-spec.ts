import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/modules/app.module';
import {
  OIDC_PROVIDER_REGISTRY,
  type OidcProviderConfig,
  type OidcProviderRegistry,
} from 'src/modules/auth/auth.config';
import { IdpType } from 'src/modules/auth/types/idp';
import request from 'supertest';
import { App } from 'supertest/types';

function createMockRegistry(): OidcProviderRegistry {
  const mockServerMetadata = () => ({
    jwks_uri: 'https://idp.example.com/.well-known/jwks.json',
    issuer: 'https://idp.example.com',
  });

  const registry: OidcProviderRegistry = new Map();
  registry.set(IdpType.BCSC, {
    client: { serverMetadata: mockServerMetadata } as unknown,
    issuer: 'https://bcsc.example.com',
    redirectUri: 'https://example.com/auth/bcsc/callback',
    postLogoutRedirectUri: 'https://example.com',
    scopes: 'openid profile email',
  } as OidcProviderConfig);
  registry.set(IdpType.IDIR, {
    client: { serverMetadata: mockServerMetadata } as unknown,
    issuer: 'https://idir.example.com',
    redirectUri: 'https://example.com/auth/idir/callback',
    postLogoutRedirectUri: 'https://example.com/admin',
    scopes: 'openid profile email',
  } as OidcProviderConfig);
  return registry;
}

// Specify the title and the type of test in the syntax below
// The integration test file name should be app.controller.example.int-spec.ts
describe('AppControllerExample (integration)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OIDC_PROVIDER_REGISTRY)
      .useFactory({ factory: createMockRegistry })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // Test case: should throw not found error when the endpoint does not exist
  // The comments are not required in an actual test file.
  // Make sure to capitalize the first letter to make it consistent across all test files.
  it('Should throw not found error when the endpoint does not exist.', () => {
    const endpoint = '/';
    request(app.getHttpServer()).get(endpoint).expect(HttpStatus.NOT_FOUND);
  });

  afterAll(async () => {
    await app?.close();
  });
});
