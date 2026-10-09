import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword, verifyPassword } from './crypto/password';
import { buildOtpauthUri, generateTotpSecret, verifyTotp } from './crypto/totp';
import { AdminAccountEntity } from './entities/admin-account.entity';
import { LoginLimiter } from './login-limiter';
import { type AuthResult, SessionsService } from './sessions.service';

export const ACCOUNT_ID = 1;
export const DEFAULT_ADMIN_PASSWORD = 'admin123';
export const MIN_PASSWORD_LENGTH = 8;

export interface TotpSetup {
  secret: string;
  otpauthUri: string;
}

const toTotpSetup = (secret: string): TotpSetup => ({
  secret,
  otpauthUri: buildOtpauthUri(secret),
});

function assertNewPassword(password: string): void {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password === DEFAULT_ADMIN_PASSWORD
  ) {
    throw new BadRequestException(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters and differ from the default`,
    );
  }
}

@Injectable()
export class AdminAccountService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(AdminAccountEntity)
    private readonly accounts: Repository<AdminAccountEntity>,
    private readonly sessions: SessionsService,
    private readonly limiter: LoginLimiter,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (await this.accounts.findOneBy({ id: ACCOUNT_ID })) return;
    await this.accounts.save(
      Object.assign(new AdminAccountEntity(), {
        id: ACCOUNT_ID,
        passwordHash: await hashPassword(DEFAULT_ADMIN_PASSWORD),
        mustChangePassword: true,
        totpSecret: null,
        pendingTotpSecret: null,
        totpLastStep: null,
      }),
    );
  }

  async login(
    password: string,
    code: string | undefined,
    now = Date.now(),
  ): Promise<AuthResult> {
    if (this.limiter.isBlocked(now)) {
      throw new HttpException(
        'Too many attempts, try again in a few minutes',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    // Reserve the attempt before any await so concurrent requests count.
    this.limiter.recordFailure(now);
    const account = await this.getAccount();
    const { totpSecret } = account;
    const needsSetup = account.mustChangePassword || totpSecret === null;

    let ok = await verifyPassword(password, account.passwordHash);
    if (ok && !needsSetup && totpSecret !== null) {
      const step = verifyTotp(
        totpSecret,
        code ?? '',
        now,
        account.totpLastStep,
      );
      ok = step !== null;
      if (step !== null) {
        account.totpLastStep = step;
        await this.accounts.save(account);
      }
    }
    if (!ok) {
      throw new UnauthorizedException('Invalid password or code');
    }

    this.limiter.reset();
    const kind = needsSetup ? 'setup' : 'full';
    return { token: await this.sessions.create(kind), kind };
  }

  async getSetupTotp(): Promise<TotpSetup> {
    const account = await this.getAccount();
    this.assertSetupPending(account);
    if (!account.pendingTotpSecret) {
      account.pendingTotpSecret = generateTotpSecret();
      await this.accounts.save(account);
    }
    return toTotpSetup(account.pendingTotpSecret);
  }

  async completeSetup(
    newPassword: string,
    code: string,
    now = Date.now(),
  ): Promise<AuthResult> {
    assertNewPassword(newPassword);
    const account = await this.getAccount();
    this.assertSetupPending(account);
    const pending = account.pendingTotpSecret;
    const step = pending ? verifyTotp(pending, code, now, null) : null;
    if (step === null) throw new BadRequestException('Invalid code');

    Object.assign(account, {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      totpSecret: pending,
      pendingTotpSecret: null,
      totpLastStep: step,
    });
    await this.accounts.save(account);
    await this.sessions.revokeAll();
    return { token: await this.sessions.create('full'), kind: 'full' };
  }

  async changePassword(
    newPassword: string,
    code: string,
    now = Date.now(),
  ): Promise<void> {
    assertNewPassword(newPassword);
    const account = await this.getAccount();
    const step = account.totpSecret
      ? verifyTotp(account.totpSecret, code, now, account.totpLastStep)
      : null;
    if (step === null) throw new BadRequestException('Invalid code');

    account.passwordHash = await hashPassword(newPassword);
    account.totpLastStep = step;
    await this.accounts.save(account);
  }

  async resetTotp(currentPassword: string): Promise<TotpSetup> {
    const account = await this.getAccount();
    if (!(await verifyPassword(currentPassword, account.passwordHash))) {
      throw new BadRequestException('Invalid password');
    }
    account.pendingTotpSecret = generateTotpSecret();
    await this.accounts.save(account);
    return toTotpSetup(account.pendingTotpSecret);
  }

  async confirmTotp(code: string, now = Date.now()): Promise<void> {
    const account = await this.getAccount();
    const pending = account.pendingTotpSecret;
    const step = pending ? verifyTotp(pending, code, now, null) : null;
    if (step === null) throw new BadRequestException('Invalid code');

    Object.assign(account, {
      totpSecret: pending,
      pendingTotpSecret: null,
      totpLastStep: step,
    });
    await this.accounts.save(account);
  }

  private assertSetupPending(account: AdminAccountEntity): void {
    if (!(account.mustChangePassword || account.totpSecret === null)) {
      throw new ForbiddenException('Setup is already complete');
    }
  }

  private async getAccount(): Promise<AdminAccountEntity> {
    const account = await this.accounts.findOneBy({ id: ACCOUNT_ID });
    if (!account) throw new Error('Admin account is not initialised');
    return account;
  }
}
