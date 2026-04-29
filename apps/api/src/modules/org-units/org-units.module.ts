import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { OrgUnitsAdminV1Controller } from './controllers/org-units-admin-v1.controller';
import { OrgUnitAdminGuard } from './guards/org-unit-admin.guard';
import { OrgUnitsService } from './services/org-units.service';

@Module({
  imports: [DatabaseModule, UsersModule, HttpModule],
  controllers: [OrgUnitsAdminV1Controller],
  providers: [OrgUnitsService, OrgUnitAdminGuard],
})
export class OrgUnitsModule {}
