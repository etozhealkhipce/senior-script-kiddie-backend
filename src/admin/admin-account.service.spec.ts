import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { InMemoryRepository } from '../../test/utils/in-memory-repository';
import {
  AdminAccountService,
  DEFAULT_ADMIN_PASSWORD,
} from './admin-account.service';
import { generateTotpCode } from './crypto/totp';
import { AdminAccountEntity } from './entities/admin-account.entity';
import { AdminSessionEntity } from './entities/admin-session.entity';
import { LoginLimiter } from './login-limiter';
import { SessionsService } from './sessions.service';

const T0 = 1_760_000_000_000;
const NEW_PASSWORD = 'correct-horse-1';

describe('AdminAccountService', () => {
  let accounts: InMemoryRepository<AdminAccountEntity>;
  let sessions: SessionsService;
  let limiter: LoginLimiter;
  let service: AdminAccountService;

  const account = () => accounts.rows[0];

  async function finishSetup(): Promise<string> {
    await service.login(DEFAULT_ADMIN_PASSWORD, undefined, T0);
    const { secret } = await service.getSetupTotp();
    await service.completeSetup(NEW_PASSWORD, generateTotpCode(secret, T0), T0);
    return secret;
  }

  beforeEach(async () => {
    accounts = new InMemoryRepository<AdminAccountEntity>('id');
    sessions = new SessionsService(
      new InMemoryRepository<AdminSessionEntity>('tokenHash').asRepository(),
    );
    limiter = new LoginLimiter();
    service = new AdminAccountService(
      accounts.asRepository(),
      sessions,
      limiter,
    );
    await service.onApplicationBootstrap();
  });

  describe('bootstrap', () => {
    it('seeds admin123 that must be changed', async () => {
      expect(accounts.rows).toHaveLength(1);
      expect(account().mustChangePassword).toBe(true);
      expect(account().totpSecret).toBeNull();
      await expect(
        service.login(DEFAULT_ADMIN_PASSWORD, undefined, T0),
      ).resolves.toMatchObject({
        kind: 'setup',
      });
    });

    it('does not overwrite an existing account', async () => {
      const hash = account().passwordHash;
      await service.onApplicationBootstrap();
      expect(accounts.rows).toHaveLength(1);
      expect(account().passwordHash).toBe(hash);
    });
  });

  describe('first-time setup', () => {
    it('rejects a wrong default password', async () => {
      await expect(service.login('admin124', undefined, T0)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns the same pending secret on repeated calls', async () => {
      const first = await service.getSetupTotp();
      const second = await service.getSetupTotp();
      expect(second.secret).toBe(first.secret);
      expect(first.otpauthUri).toContain(`secret=${first.secret}`);
    });

    it('rejects weak or default passwords', async () => {
      const { secret } = await service.getSetupTotp();
      const code = generateTotpCode(secret, T0);
      await expect(service.completeSetup('short', code, T0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.completeSetup(DEFAULT_ADMIN_PASSWORD, code, T0),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a wrong code', async () => {
      await service.getSetupTotp();
      await expect(
        service.completeSetup(NEW_PASSWORD, '000000', T0),
      ).rejects.toThrow(BadRequestException);
    });

    it('revokes every setup session when setup completes', async () => {
      const first = await service.login(DEFAULT_ADMIN_PASSWORD, undefined, T0);
      const second = await service.login(DEFAULT_ADMIN_PASSWORD, undefined, T0);
      expect(first.kind).toBe('setup');
      expect(second.kind).toBe('setup');
      await expect(sessions.resolve(first.token)).resolves.not.toBeNull();
      await expect(sessions.resolve(second.token)).resolves.not.toBeNull();

      const { secret: pending } = await service.getSetupTotp();
      await service.completeSetup(
        NEW_PASSWORD,
        generateTotpCode(pending, T0),
        T0,
      );
      await expect(sessions.resolve(first.token)).resolves.toBeNull();
      await expect(sessions.resolve(second.token)).resolves.toBeNull();
    });

    it('stores password and secret, swaps the setup session for a full one', async () => {
      const { token: setupToken } = await service.login(
        DEFAULT_ADMIN_PASSWORD,
        undefined,
        T0,
      );
      const { secret } = await service.getSetupTotp();
      const result = await service.completeSetup(
        NEW_PASSWORD,
        generateTotpCode(secret, T0),
        T0,
      );
      expect(result.kind).toBe('full');
      await expect(sessions.resolve(setupToken)).resolves.toBeNull();
      await expect(sessions.resolve(result.token)).resolves.toMatchObject({
        kind: 'full',
      });
      expect(account()).toMatchObject({
        mustChangePassword: false,
        totpSecret: secret,
        pendingTotpSecret: null,
      });
    });
  });

  describe('login after setup', () => {
    let secret: string;
    beforeEach(async () => {
      secret = await finishSetup();
    });

    it('rejects getSetupTotp and completeSetup once setup is complete', async () => {
      await expect(service.getSetupTotp()).rejects.toThrow(ForbiddenException);
      const at = T0 + 60_000;
      await expect(
        service.completeSetup('another-pass', generateTotpCode(secret, at), at),
      ).rejects.toThrow(ForbiddenException);
    });

    it('requires the code', async () => {
      await expect(
        service.login(NEW_PASSWORD, undefined, T0 + 30_000),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('accepts password + fresh code and rejects replaying it', async () => {
      const at = T0 + 60_000;
      const code = generateTotpCode(secret, at);
      await expect(
        service.login(NEW_PASSWORD, code, at),
      ).resolves.toMatchObject({
        kind: 'full',
      });
      await expect(service.login(NEW_PASSWORD, code, at)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects the old default password', async () => {
      const at = T0 + 60_000;
      await expect(
        service.login(DEFAULT_ADMIN_PASSWORD, generateTotpCode(secret, at), at),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns 429 after too many failures, even for correct credentials', async () => {
      for (let i = 0; i < LoginLimiter.MAX_FAILURES; i++) {
        await expect(service.login('wrong', '000000', T0)).rejects.toThrow(
          UnauthorizedException,
        );
      }
      const at = T0 + 60_000;
      const error = await service
        .login(NEW_PASSWORD, generateTotpCode(secret, at), at)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    });

    it('holds the limiter under concurrent wrong logins', async () => {
      const results = await Promise.allSettled(
        Array.from({ length: 30 }, () => service.login('wrong', '000000', T0)),
      );
      const reasons = results.map((r) =>
        r.status === 'rejected' ? (r.reason as unknown) : null,
      );
      const unauthorized = reasons.filter(
        (e) => e instanceof UnauthorizedException,
      );
      const throttled = reasons.filter(
        (e) => e instanceof HttpException && e.getStatus() === 429,
      );
      expect(unauthorized.length).toBeLessThanOrEqual(
        LoginLimiter.MAX_FAILURES,
      );
      expect(unauthorized.length + throttled.length).toBe(30);
      expect(throttled.length).toBeGreaterThanOrEqual(
        30 - LoginLimiter.MAX_FAILURES,
      );
    });

    it('changes the password with a valid code', async () => {
      const at = T0 + 60_000;
      await expect(
        service.changePassword('another-pass', '000000', at),
      ).rejects.toThrow(BadRequestException);
      await service.changePassword(
        'another-pass',
        generateTotpCode(secret, at),
        at,
      );
      const later = T0 + 120_000;
      await expect(
        service.login('another-pass', generateTotpCode(secret, later), later),
      ).resolves.toMatchObject({ kind: 'full' });
    });

    it('re-enrolls the authenticator', async () => {
      await expect(service.resetTotp('wrong')).rejects.toThrow(
        BadRequestException,
      );
      const { secret: next } = await service.resetTotp(NEW_PASSWORD);
      expect(next).not.toBe(secret);
      await expect(service.confirmTotp('000000', T0)).rejects.toThrow(
        BadRequestException,
      );
      await service.confirmTotp(
        generateTotpCode(next, T0 + 60_000),
        T0 + 60_000,
      );
      const later = T0 + 120_000;
      await expect(
        service.login(NEW_PASSWORD, generateTotpCode(next, later), later),
      ).resolves.toMatchObject({ kind: 'full' });
      expect(account().pendingTotpSecret).toBeNull();
    });
  });
});
