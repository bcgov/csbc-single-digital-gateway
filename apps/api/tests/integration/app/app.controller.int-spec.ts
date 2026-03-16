import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/modules/app.module';
import request from 'supertest';
import { App } from 'supertest/types';

// Specify the title and the type of test in the syntax below
// The integration test file name should be app.controller.example.int-spec.ts
describe('AppControllerExample (integration)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // Test case: should throw not found error when the endpoint does not exist
  // The comments are not required in an actual test file.
  // Make sure to capitalize the first letter to make it consistent across all test files.
  it('Should throw not found error when the endpoint does not exist.', () => {
    const endpoint = '/';
    return request(app.getHttpServer())
      .get(endpoint)
      .expect(HttpStatus.NOT_FOUND);
  });

  afterAll(async () => {
    await app?.close();
  });
});
