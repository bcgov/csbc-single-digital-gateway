import { Module } from '@nestjs/common';
import type { DynamicModule, InjectionToken, ModuleMetadata, Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { M2M_AUTH_OPTIONS, M2M_TOKEN_VERIFIER } from './m2m-auth.constants';
import { M2mAuthGuard } from './m2m-auth.guard';
import type { M2mAuthModuleOptions, M2mTokenVerifier } from './m2m-auth.types';
import { OidcJwtVerifier } from './m2m-auth.verifier';

export interface M2mAuthModuleAsyncOptions<TArgs extends unknown[] = unknown[]> extends Pick<
  ModuleMetadata,
  'imports'
> {
  inject?: InjectionToken[];
  useFactory: (...args: TArgs) => M2mAuthModuleOptions | Promise<M2mAuthModuleOptions>;
}

/**
 * Stateless resource-server auth for machine-to-machine (client-credentials) callers.
 * Importing it registers {@link M2mAuthGuard} as a global APP_GUARD — the app becomes
 * protected-by-default; opt out per-route with `@Public()` or via `publicPaths`.
 *
 * Deliberately separate from `@repo/nestjs/auth` (the session-based OIDC BFF): an m2m
 * resource server has no sessions, no cookies, no login endpoints, no CSRF and no refresh —
 * only per-request JWT validation.
 */
@Module({})
export class M2mAuthModule {
  /** Configure with static options. */
  static forRoot(options: M2mAuthModuleOptions): DynamicModule {
    return M2mAuthModule.build({ provide: M2M_AUTH_OPTIONS, useValue: options }, []);
  }

  /** Configure with options resolved from DI (e.g. `ConfigService`). */
  static forRootAsync<TArgs extends unknown[]>(
    options: M2mAuthModuleAsyncOptions<TArgs>,
  ): DynamicModule {
    const optionsProvider: Provider = {
      provide: M2M_AUTH_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };
    return M2mAuthModule.build(optionsProvider, options.imports ?? []);
  }

  private static build(
    optionsProvider: Provider,
    imports: NonNullable<ModuleMetadata['imports']>,
  ): DynamicModule {
    return {
      module: M2mAuthModule,
      global: true,
      imports,
      providers: [
        optionsProvider,
        {
          // The injection seam: tests pass `options.verifier` (stub); production omits it
          // and gets JWKS verification against the configured issuer.
          provide: M2M_TOKEN_VERIFIER,
          useFactory: (options: M2mAuthModuleOptions): M2mTokenVerifier =>
            options.verifier ?? new OidcJwtVerifier(options),
          inject: [M2M_AUTH_OPTIONS],
        },
        // Global, protected-by-default (fail-closed) the moment M2mAuthModule is imported.
        { provide: APP_GUARD, useClass: M2mAuthGuard },
      ],
      exports: [M2M_AUTH_OPTIONS, M2M_TOKEN_VERIFIER],
    };
  }
}
