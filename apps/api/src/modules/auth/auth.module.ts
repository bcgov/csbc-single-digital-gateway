import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { oidcProviderRegistryProvider } from './auth.config';
import { BcscAuthController } from './controllers/bcsc-auth.controller';
import { IdirAuthController } from './controllers/idir-auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';

@Module({
  imports: [UsersModule],
  providers: [oidcProviderRegistryProvider, AuthService, AuthGuard],
  controllers: [BcscAuthController, IdirAuthController],
  exports: [oidcProviderRegistryProvider, AuthService, AuthGuard],
})
export class AuthModule {}
