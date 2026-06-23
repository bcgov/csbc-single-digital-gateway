import { Module } from '@nestjs/common';
import type {
  DynamicModule,
  InjectionToken,
  ModuleMetadata,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';

import { DATABASE_CLIENT } from './database.constants';

/** Called once on application shutdown to release the client (close pools, etc.). */
type Destroyer<TClient> = (client: TClient) => void | Promise<void>;

/** Options for {@link DatabaseModule.forRoot} — an already-constructed client. */
export interface DatabaseModuleOptions<TClient = unknown> {
  client: TClient;
  onDestroy?: Destroyer<TClient>;
}

/** Options for {@link DatabaseModule.forRootAsync} — build the client via a factory. */
export interface DatabaseModuleAsyncOptions<
  TClient = unknown,
  TArgs extends unknown[] = unknown[],
> extends Pick<ModuleMetadata, 'imports'> {
  inject?: InjectionToken[];
  useFactory: (...args: TArgs) => TClient | Promise<TClient>;
  onDestroy?: Destroyer<TClient>;
}

// Internal token: the lifecycle holder that runs onDestroy on shutdown.
const DATABASE_SHUTDOWN = Symbol('DATABASE_SHUTDOWN');

// Holds the resolved client + optional disposer; Nest calls the hook on app close.
class DatabaseShutdown<TClient> implements OnApplicationShutdown {
  constructor(
    private readonly client: TClient,
    private readonly onDestroy?: Destroyer<TClient>,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.onDestroy) {
      await this.onDestroy(this.client);
    }
  }
}

/**
 * Registers a consumer-provided database client for injection via {@link InjectDatabase}.
 *
 * Client-agnostic: the module treats the client opaquely (generic `TClient`) and never
 * depends on any ORM/driver. Registration is **global**, so any provider can inject the
 * client without re-importing this module. An optional `onDestroy(client)` runs on
 * application shutdown (wire `app.enableShutdownHooks()` to drain on SIGTERM/SIGINT).
 */
@Module({})
export class DatabaseModule {
  /** Register an already-constructed client. */
  static forRoot<TClient>(options: DatabaseModuleOptions<TClient>): DynamicModule {
    const clientProvider: Provider = { provide: DATABASE_CLIENT, useValue: options.client };
    return DatabaseModule.build(clientProvider, options.onDestroy, []);
  }

  /** Build the client via a factory (may inject `ConfigService` etc.). */
  static forRootAsync<TClient, TArgs extends unknown[]>(
    options: DatabaseModuleAsyncOptions<TClient, TArgs>,
  ): DynamicModule {
    const clientProvider: Provider = {
      provide: DATABASE_CLIENT,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };
    return DatabaseModule.build(clientProvider, options.onDestroy, options.imports ?? []);
  }

  private static build<TClient>(
    clientProvider: Provider,
    onDestroy: Destroyer<TClient> | undefined,
    imports: NonNullable<ModuleMetadata['imports']>,
  ): DynamicModule {
    const shutdownProvider: Provider = {
      provide: DATABASE_SHUTDOWN,
      useFactory: (client: TClient) => new DatabaseShutdown(client, onDestroy),
      inject: [DATABASE_CLIENT],
    };

    return {
      module: DatabaseModule,
      global: true,
      imports,
      providers: [clientProvider, shutdownProvider],
      exports: [DATABASE_CLIENT],
    };
  }
}
