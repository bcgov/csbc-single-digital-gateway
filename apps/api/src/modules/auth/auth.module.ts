import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { oidcClientProvider } from './auth.config';
import { AuthGuard } from './guards/auth.guard';

@Module({
  providers: [oidcClientProvider, AuthService, AuthGuard],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
