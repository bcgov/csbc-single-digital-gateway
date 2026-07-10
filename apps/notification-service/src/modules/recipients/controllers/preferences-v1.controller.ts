import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import { PreferencesResponseDto, UpdatePreferencesDto } from '../dtos/preferences.dtos';
import type { PreferencesResponse } from '../dtos/preferences.dtos';
import { PreferencesService } from '../services/preferences.service';

/**
 * Recipient profile + channel preference endpoints (m2m-guarded; BFF-proxied for end users).
 */
@Controller({ path: 'recipients', version: '1' })
export class PreferencesV1Controller {
  constructor(private readonly preferences: PreferencesService) {}

  @Get(':userId/preferences')
  @ZodSerializerDto(PreferencesResponseDto)
  get(@Param('userId') userId: string): Promise<PreferencesResponse> {
    return this.preferences.get(userId);
  }

  @Put(':userId/preferences')
  @ZodSerializerDto(PreferencesResponseDto)
  update(
    @Param('userId') userId: string,
    @Body() body: UpdatePreferencesDto,
  ): Promise<PreferencesResponse> {
    return this.preferences.update(userId, body);
  }
}
