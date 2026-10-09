import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AdminToken,
  AdminTokenGuard,
  AllowSessionKinds,
} from '../common/guards/admin-token.guard';
import { AdminAccountService } from './admin-account.service';
import {
  CurrentPasswordDto,
  LoginDto,
  NewPasswordDto,
  PasskeyLoginDto,
  PasskeyRegisterDto,
  TotpCodeDto,
} from './dto/auth.dto';
import { PasskeysService } from './passkeys.service';
import { SessionsService } from './sessions.service';

@Controller('admin')
export class AdminAuthController {
  constructor(
    private readonly account: AdminAccountService,
    private readonly passkeys: PasskeysService,
    private readonly sessions: SessionsService,
  ) {}

  @Get('validate')
  @UseGuards(AdminTokenGuard)
  validate(): { ok: true } {
    return { ok: true };
  }

  // ── Password + authenticator code ───────────────────────────
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.account.login(dto.password, dto.code);
  }

  @Get('auth/setup')
  @UseGuards(AdminTokenGuard)
  @AllowSessionKinds('setup')
  getSetup() {
    return this.account.getSetupTotp();
  }

  @Post('auth/setup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminTokenGuard)
  @AllowSessionKinds('setup')
  completeSetup(@Body() dto: NewPasswordDto) {
    return this.account.completeSetup(dto.newPassword, dto.code);
  }

  @Post('auth/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminTokenGuard)
  changePassword(@Body() dto: NewPasswordDto) {
    return this.account.changePassword(dto.newPassword, dto.code);
  }

  @Post('auth/totp/reset')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminTokenGuard)
  resetTotp(@Body() dto: CurrentPasswordDto) {
    return this.account.resetTotp(dto.currentPassword);
  }

  @Post('auth/totp/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminTokenGuard)
  confirmTotp(@Body() dto: TotpCodeDto) {
    return this.account.confirmTotp(dto.code);
  }

  // ── Passkeys (Face ID / Touch ID) ───────────────────────────
  @Post('auth/passkey/login/options')
  @HttpCode(HttpStatus.OK)
  passkeyLoginOptions() {
    return this.passkeys.loginOptions();
  }

  @Post('auth/passkey/login/verify')
  @HttpCode(HttpStatus.OK)
  passkeyLoginVerify(@Body() dto: PasskeyLoginDto) {
    return this.passkeys.verifyLogin(dto.response);
  }

  @Post('auth/passkey/register/options')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminTokenGuard)
  passkeyRegisterOptions() {
    return this.passkeys.registrationOptions();
  }

  @Post('auth/passkey/register/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminTokenGuard)
  passkeyRegisterVerify(@Body() dto: PasskeyRegisterDto) {
    return this.passkeys.verifyRegistration(dto.response, dto.name);
  }

  @Get('auth/passkeys')
  @UseGuards(AdminTokenGuard)
  listPasskeys() {
    return this.passkeys.list();
  }

  @Delete('auth/passkeys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminTokenGuard)
  removePasskey(@Param('id') id: string) {
    return this.passkeys.remove(id);
  }

  // ── Sessions ────────────────────────────────────────────────
  @Post('auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminTokenGuard)
  @AllowSessionKinds('full', 'setup')
  logout(@AdminToken() token: string) {
    return this.sessions.revoke(token);
  }

  @Post('auth/logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminTokenGuard)
  logoutAll() {
    return this.sessions.revokeAll();
  }
}
