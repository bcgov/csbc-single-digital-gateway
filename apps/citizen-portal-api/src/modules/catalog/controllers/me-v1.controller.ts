import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import { MyApplicationListDto } from '../dtos/catalog.dtos';
import { CatalogService } from '../services/catalog.service';

/**
 * `/v1/me` — the signed-in citizen's own data. Protected-by-default (the global AuthGuard 401s
 * without a session). Workspace-free, like the rest of the catalog.
 */
@ApiTags('Me')
@Controller({ path: 'me', version: '1' })
export class MeV1Controller {
  constructor(private readonly catalog: CatalogService) {}

  @Get('applications')
  @ZodSerializerDto(MyApplicationListDto)
  async applications(@CurrentUser() user: AuthUser) {
    return { items: await this.catalog.listMyApplications(user.id) };
  }
}
