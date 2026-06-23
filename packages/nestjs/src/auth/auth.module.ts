import { Module } from '@nestjs/common';
import type { DynamicModule, InjectionToken, ModuleMetadata, Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AUTH_OPTIONS, AUTH_USER_SYNC, OIDC_CONFIG } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { passthroughUserSync } from './auth.user-sync';
import type { AuthModuleOptions } from './auth.types';
import { resolveOidcConfig } from './oidc.provider';

export interface AuthModuleAsyncOptions<TArgs extends unknown[] = unknown[]> extends Pick<
  ModuleMetadata,
  'imports'
> {
  inject?: InjectionToken[];
  useFactory: (...args: TArgs) => AuthModuleOptions | Promise<AuthModuleOptions>;
  /** Provider for the AUTH_USER_SYNC token; omit for the passthrough default. */
  userSync?: Provider;
}

/**
 * Foundation of the OIDC BFF auth module (global). Provides the resolved options, the
 * discovered openid-client `Configuration`, and the `onSignIn` sync port. Endpoints and the
 * guard are added by later features; the session middleware is applied by the consumer using
 * {@link buildSessionOptions}.
 */
@Module({})
export class AuthModule {
  /** Configure with static options (the sync port defaults to passthrough). */
  static forRoot(options: AuthModuleOptions, userSync?: Provider): DynamicModule {
    return AuthModule.build({ provide: AUTH_OPTIONS, useValue: options }, [], userSync);
  }

  /** Configure with options resolved from DI (e.g. `ConfigService`). */
  static forRootAsync<TArgs extends unknown[]>(
    options: AuthModuleAsyncOptions<TArgs>,
  ): DynamicModule {
    const optionsProvider: Provider = {
      provide: AUTH_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };
    return AuthModule.build(optionsProvider, options.imports ?? [], options.userSync);
  }

  private static build(
    optionsProvider: Provider,
    imports: NonNullable<ModuleMetadata['imports']>,
    userSync: Provider | undefined,
  ): DynamicModule {
    const oidcProvider: Provider = {
      provide: OIDC_CONFIG,
      useFactory: (options: AuthModuleOptions) => resolveOidcConfig(options),
      inject: [AUTH_OPTIONS],
    };
    const syncProvider: Provider = userSync ?? {
      provide: AUTH_USER_SYNC,
      useValue: passthroughUserSync,
    };

    return {
      module: AuthModule,
      global: true,
      imports,
      controllers: [AuthController],
      providers: [
        optionsProvider,
        oidcProvider,
        syncProvider,
        // Global, protected-by-default (fail-closed) the moment AuthModule is imported.
        { provide: APP_GUARD, useClass: AuthGuard },
      ],
      exports: [AUTH_OPTIONS, OIDC_CONFIG, AUTH_USER_SYNC],
    };
  }
}
