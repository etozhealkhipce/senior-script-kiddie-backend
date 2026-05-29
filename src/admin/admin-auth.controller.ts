import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AdminTokenGuard } from '../common/guards/admin-token.guard';

@Controller('admin')
export class AdminAuthController {
  /**
   * GET /admin/validate
   * Lightweight endpoint to check whether the current token is valid.
   * Protected by AdminTokenGuard — returns 200 if valid, 401 if not.
   */
  @Get('validate')
  @UseGuards(AdminTokenGuard)
  @HttpCode(HttpStatus.OK)
  validate(): { ok: true } {
    return { ok: true };
  }
}
