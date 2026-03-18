import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { oidcClientProvider } from './auth.config';
import { AuthController } from './controllers/auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';

@Module({
  imports: [UsersModule],
  providers: [oidcClientProvider, AuthService, AuthGuard],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
