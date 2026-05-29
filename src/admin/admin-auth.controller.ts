import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LocalhostGuard } from '../common/guards/localhost.guard';
import { AdminTokenGuard } from '../common/guards/admin-token.guard';
import { AdminAuthService } from './admin-auth.service';

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('token')
  @UseGuards(LocalhostGuard)
  @HttpCode(HttpStatus.OK)
  generate(@Query('hours') hours?: string): {
    token: string;
    expiresAt: string;
  } {
    return this.adminAuthService.generate(parseInt(hours ?? '24', 10));
  }

  @Get('validate')
  @UseGuards(AdminTokenGuard)
  @HttpCode(HttpStatus.OK)
  validate(): { ok: true } {
    return { ok: true };
  }
}
