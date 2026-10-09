import {
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import * as webauthn from '@simplewebauthn/server';
import { InMemoryRepository } from '../../test/utils/in-memory-repository';
import { ChallengeStore } from './challenge-store';
import { AdminPasskeyEntity } from './entities/admin-passkey.entity';
import { AdminSessionEntity } from './entities/admin-session.entity';
import { PasskeysService } from './passkeys.service';
import { SessionsService } from './sessions.service';

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

const mocked = jest.mocked(webauthn);
type RegOptions = Awaited<
  ReturnType<typeof webauthn.generateRegistrationOptions>
>;
type AuthOptions = Awaited<
  ReturnType<typeof webauthn.generateAuthenticationOptions>
>;
type RegResult = Awaited<
  ReturnType<typeof webauthn.verifyRegistrationResponse>
>;
type AuthResultLib = Awaited<
  ReturnType<typeof webauthn.verifyAuthenticationResponse>
>;
type ChallengeCheck = (challenge: string) => boolean | Promise<boolean>;

const config = { get: () => undefined } as unknown as ConfigService;
const registrationResponse = {
  id: 'cred-1',
} as webauthn.RegistrationResponseJSON;
const authenticationResponse = {
  id: 'cred-1',
} as webauthn.AuthenticationResponseJSON;

describe('PasskeysService', () => {
  let passkeys: InMemoryRepository<AdminPasskeyEntity>;
  let sessions: SessionsService;
  let service: PasskeysService;

  beforeEach(() => {
    jest.resetAllMocks();
    passkeys = new InMemoryRepository<AdminPasskeyEntity>('id');
    sessions = new SessionsService(
      new InMemoryRepository<AdminSessionEntity>('tokenHash').asRepository(),
    );
    service = new PasskeysService(
      passkeys.asRepository(),
      new ChallengeStore(),
      sessions,
      config,
    );
  });

  async function register(): Promise<void> {
    mocked.generateRegistrationOptions.mockResolvedValue({
      challenge: 'reg-c',
    } as RegOptions);
    mocked.verifyRegistrationResponse.mockImplementation(async (opts) => {
      const ok = await (opts.expectedChallenge as ChallengeCheck)('reg-c');
      return (ok
        ? {
            verified: true,
            registrationInfo: {
              credential: {
                id: 'cred-1',
                publicKey: new Uint8Array([1, 2, 3]),
                counter: 0,
                transports: ['internal', 'hybrid'],
              },
            },
          }
        : { verified: false }) as unknown as RegResult;
    });
    await service.registrationOptions();
    await service.verifyRegistration(registrationResponse, '  iPhone  ');
  }

  it('builds registration options for the configured RP and excludes known keys', async () => {
    await register();
    await service.registrationOptions();
    expect(mocked.generateRegistrationOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rpID: 'localhost',
        userName: 'admin',
        attestationType: 'none',
        excludeCredentials: [
          { id: 'cred-1', transports: ['internal', 'hybrid'] },
        ],
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'required',
        },
      }),
    );
  });

  it('stores a verified passkey with a trimmed name', async () => {
    await register();
    expect(passkeys.rows).toHaveLength(1);
    expect(passkeys.rows[0]).toMatchObject({
      id: 'cred-1',
      name: 'iPhone',
      counter: 0,
    });
    expect(Buffer.from(passkeys.rows[0].publicKey)).toEqual(
      Buffer.from([1, 2, 3]),
    );
    expect(mocked.verifyRegistrationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedOrigin: 'http://localhost:3000',
        expectedRPID: 'localhost',
      }),
    );
  });

  it('rejects a registration whose challenge was not issued', async () => {
    mocked.verifyRegistrationResponse.mockImplementation(async (opts) => {
      const ok = await (opts.expectedChallenge as ChallengeCheck)(
        'never-issued',
      );
      return { verified: ok } as unknown as RegResult;
    });
    await expect(
      service.verifyRegistration(registrationResponse, 'x'),
    ).rejects.toThrow(BadRequestException);
    expect(passkeys.rows).toHaveLength(0);
  });

  it('returns 401 for a passkey that is not registered', async () => {
    await expect(service.verifyLogin(authenticationResponse)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mocked.verifyAuthenticationResponse).not.toHaveBeenCalled();
  });

  it('returns 401 without touching the repo when the id is missing', async () => {
    await register();
    const findSpy = jest.spyOn(passkeys, 'findOneBy');
    for (const bad of [{ id: {} }, {}, { id: '' }]) {
      await expect(
        service.verifyLogin(bad as unknown as typeof authenticationResponse),
      ).rejects.toThrow(UnauthorizedException);
    }
    expect(findSpy).not.toHaveBeenCalled();
    expect(mocked.verifyAuthenticationResponse).not.toHaveBeenCalled();
  });

  it('logs in with a registered passkey and bumps the counter', async () => {
    await register();
    mocked.generateAuthenticationOptions.mockResolvedValue({
      challenge: 'login-c',
    } as AuthOptions);
    mocked.verifyAuthenticationResponse.mockImplementation(async (opts) => {
      const ok = await (opts.expectedChallenge as ChallengeCheck)('login-c');
      return (ok
        ? { verified: true, authenticationInfo: { newCounter: 7 } }
        : { verified: false }) as unknown as AuthResultLib;
    });

    await service.loginOptions();
    expect(mocked.generateAuthenticationOptions).toHaveBeenCalledWith({
      rpID: 'localhost',
      userVerification: 'required',
    });
    const result = await service.verifyLogin(authenticationResponse);

    expect(result.kind).toBe('full');
    await expect(sessions.resolve(result.token)).resolves.toMatchObject({
      kind: 'full',
    });
    expect(passkeys.rows[0].counter).toBe(7);
    expect(passkeys.rows[0].lastUsedAt).toBeInstanceOf(Date);
  });

  it('returns 401 when the library throws', async () => {
    await register();
    mocked.verifyAuthenticationResponse.mockRejectedValue(
      new Error('bad signature'),
    );
    await expect(service.verifyLogin(authenticationResponse)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('lists passkeys without key material and removes them', async () => {
    await register();
    const list = await service.list();
    expect(list).toHaveLength(1);
    expect(Object.keys(list[0]).sort()).toEqual([
      'createdAt',
      'id',
      'lastUsedAt',
      'name',
    ]);
    expect(list[0]).toMatchObject({
      id: 'cred-1',
      name: 'iPhone',
      lastUsedAt: null,
    });
    expect(list[0].createdAt).toBeInstanceOf(Date);
    await service.remove('cred-1');
    expect(passkeys.rows).toHaveLength(0);
    await expect(service.remove('cred-1')).rejects.toThrow(NotFoundException);
  });
});
