import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import { DATABASE_CLIENT, DatabaseModule, InjectDatabase } from '../src/database';

// A stand-in for any consumer-provided client (the module is client-agnostic).
interface FakeClient {
  readonly tag: string;
  end: () => Promise<void>;
}
const makeClient = (tag = 'client'): FakeClient => ({ tag, end: () => Promise.resolve() });

@Injectable()
class Consumer {
  constructor(@InjectDatabase() readonly db: FakeClient) {}
}

// Deliberately does NOT import DatabaseModule — proves the module is global.
@Module({ providers: [Consumer] })
class ConsumerModule {}

describe('DatabaseModule.forRoot', () => {
  it('provides the client under DATABASE_CLIENT and injects it globally', async () => {
    const client = makeClient();
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRoot({ client }), ConsumerModule],
    }).compile();

    expect(moduleRef.get(DATABASE_CLIENT)).toBe(client);
    expect(moduleRef.get(Consumer).db).toBe(client);
  });

  it('invokes onDestroy(client) on application shutdown', async () => {
    const client = makeClient();
    const onDestroy = vi.fn();
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRoot({ client, onDestroy })],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    await app.close();

    expect(onDestroy).toHaveBeenCalledTimes(1);
    expect(onDestroy).toHaveBeenCalledWith(client);
  });

  it('does not require onDestroy', async () => {
    const client = makeClient();
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRoot({ client })],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    await expect(app.close()).resolves.not.toThrow();
  });
});

describe('DatabaseModule.forRootAsync', () => {
  it('builds the client via useFactory and provides it', async () => {
    const client = makeClient('async');
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRootAsync({ useFactory: () => client })],
    }).compile();

    expect(moduleRef.get(DATABASE_CLIENT)).toBe(client);
  });

  it('injects dependencies from imported modules into useFactory', async () => {
    const client = makeClient('injected');
    const SETTINGS = Symbol('SETTINGS');

    @Module({
      providers: [{ provide: SETTINGS, useValue: { build: () => client } }],
      exports: [SETTINGS],
    })
    class SettingsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        DatabaseModule.forRootAsync({
          imports: [SettingsModule],
          inject: [SETTINGS],
          useFactory: (s: { build: () => FakeClient }) => s.build(),
        }),
      ],
    }).compile();

    expect(moduleRef.get(DATABASE_CLIENT)).toBe(client);
  });

  it('invokes onDestroy(client) on shutdown for the async form', async () => {
    const client = makeClient('async-destroy');
    const onDestroy = vi.fn();
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRootAsync({ useFactory: () => client, onDestroy })],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    await app.close();

    expect(onDestroy).toHaveBeenCalledWith(client);
  });
});
