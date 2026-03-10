import { HttpService } from '@nestjs/axios';
import {
  All,
  Controller,
  Logger,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';

@Controller({ path: 'consent-proxy', version: '1' })
export class ConsentProxyController {
  private readonly logger = new Logger(ConsentProxyController.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService<AppConfigDto, true>,
  ) {
    this.baseUrl = configService.get<string>('CONSENT_MANAGER_API_URL') ?? '';
  }

  @All('*path')
  async proxy(@Req() req: Request, @Res() res: Response): Promise<void> {
    const accessToken = req.session?.accessToken;
    if (!accessToken) {
      throw new UnauthorizedException('No session token available');
    }

    const targetPath = req.path.replace(/^\/v1\/consent-proxy\//, '');
    const targetUrl = `${this.baseUrl}/${targetPath}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: req.method,
          url: targetUrl,
          params: req.query,
          data: req.body as unknown,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': req.headers['content-type'] ?? 'application/json',
          },
          validateStatus: () => true,
        }),
      );

      res.status(response.status).json(response.data);
    } catch (error) {
      this.logger.error(
        'Consent proxy request failed',
        (error as Error).message,
      );
      res.status(502).json({ message: 'Consent manager unavailable' });
    }
  }
}
