import { Body, Controller, Get, HttpCode, Post, Query, Redirect, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { EndUserAuthService } from './end-user-auth.service';
import { MagicLinkDto } from './dto/magic-link.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('portal-auth')
@Controller('portal/auth')
export class EndUserAuthController {
  constructor(
    private readonly service: EndUserAuthService,
    private readonly config: ConfigService
  ) {}

  @Post('magic-link')
  @HttpCode(200)
  @Throttle({ short: { limit: 3, ttl: 3600000 } })
  @ApiOperation({ summary: 'Send a magic link to end-user email' })
  async sendMagicLink(@Body() dto: MagicLinkDto) {
    await this.service.sendMagicLink(dto.email, dto.aiSlug, dto.username);
    return { success: true };
  }

  @Get('verify')
  @Redirect()
  @ApiOperation({ summary: 'Verify magic link token and create session' })
  async verifyToken(@Query() query: VerifyTokenDto, @Res({ passthrough: true }) res: Response) {
    const sessionToken = await this.service.verifyMagicLink(query.token);
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    res.cookie('eu_session', sessionToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return { url: `${frontendUrl}/portal/conversations` };
  }

  @Post('sign-out')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign out end-user' })
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionToken = req.cookies?.['eu_session'] as string | undefined;
    if (sessionToken) {
      await this.service.signOut(sessionToken);
    }
    res.clearCookie('eu_session', { path: '/' });
    return { success: true };
  }
}
