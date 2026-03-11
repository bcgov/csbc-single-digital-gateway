import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { oidcClientProvider } from './auth.config';
import { AuthGuard } from './guards/auth.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [oidcClientProvider, AuthService, AuthGuard],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
