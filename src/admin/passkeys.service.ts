import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { Repository } from 'typeorm';
import { ChallengeStore } from './challenge-store';
import { AdminPasskeyEntity } from './entities/admin-passkey.entity';
import { type AuthResult, SessionsService } from './sessions.service';

export interface PasskeyView {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

// Fixed WebAuthn user handle: there is exactly one admin.
const ADMIN_USER_ID = Uint8Array.from(Buffer.from('sskd-admin'));

const toView = ({
  id,
  name,
  createdAt,
  lastUsedAt,
}: AdminPasskeyEntity): PasskeyView => ({
  id,
  name,
  createdAt,
  lastUsedAt,
});

@Injectable()
export class PasskeysService {
  private readonly rpID: string;
  private readonly origin: string;

  constructor(
    @InjectRepository(AdminPasskeyEntity)
    private readonly passkeys: Repository<AdminPasskeyEntity>,
    private readonly challenges: ChallengeStore,
    private readonly sessions: SessionsService,
    config: ConfigService,
  ) {
    this.rpID = config.get<string>('WEBAUTHN_RP_ID') ?? 'localhost';
    this.origin =
      config.get<string>('WEBAUTHN_ORIGIN') ?? 'http://localhost:3000';
  }

  async registrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const existing = await this.passkeys.find();
    const options = await generateRegistrationOptions({
      rpName: 'sskd admin',
      rpID: this.rpID,
      userName: 'admin',
      userID: ADMIN_USER_ID,
      attestationType: 'none',
      excludeCredentials: existing.map((p) => ({
        id: p.id,
        transports: p.transports ?? undefined,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
    });
    this.challenges.add('register', options.challenge);
    return options;
  }

  async verifyRegistration(
    response: RegistrationResponseJSON,
    name: string,
  ): Promise<PasskeyView> {
    let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: (challenge) =>
          this.challenges.consume('register', challenge),
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: true,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Passkey registration failed',
      );
    }
    if (!verification.verified)
      throw new BadRequestException('Passkey registration failed');

    const { credential } = verification.registrationInfo;
    const passkey = Object.assign(new AdminPasskeyEntity(), {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? null,
      name: name.trim() || 'Passkey',
      createdAt: new Date(),
      lastUsedAt: null,
    });
    await this.passkeys.save(passkey);
    return toView(passkey);
  }

  async loginOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
    // No allowCredentials: the browser offers the discoverable passkeys it has for this site.
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'required',
    });
    this.challenges.add('login', options.challenge);
    return options;
  }

  async verifyLogin(response: AuthenticationResponseJSON): Promise<AuthResult> {
    // TypeORM drops undefined conditions, which would match an arbitrary row.
    if (typeof response?.id !== 'string' || response.id === '')
      throw new UnauthorizedException('Unknown passkey');
    const passkey = await this.passkeys.findOneBy({ id: response.id });
    if (!passkey) throw new UnauthorizedException('Unknown passkey');

    let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: (challenge) =>
          this.challenges.consume('login', challenge),
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        credential: {
          id: passkey.id,
          publicKey: new Uint8Array(passkey.publicKey),
          counter: passkey.counter,
          transports: passkey.transports ?? undefined,
        },
        requireUserVerification: true,
      });
    } catch {
      throw new UnauthorizedException('Passkey verification failed');
    }
    if (!verification.verified)
      throw new UnauthorizedException('Passkey verification failed');

    await this.passkeys.update(
      { id: passkey.id },
      {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    );
    return { token: await this.sessions.create('full'), kind: 'full' };
  }

  async list(): Promise<PasskeyView[]> {
    const passkeys = await this.passkeys.find({ order: { createdAt: 'ASC' } });
    return passkeys.map(toView);
  }

  async remove(id: string): Promise<void> {
    const { affected } = await this.passkeys.delete({ id });
    if (!affected) throw new NotFoundException('Passkey not found');
  }
}
