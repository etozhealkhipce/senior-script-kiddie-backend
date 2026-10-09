import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { LessThan, Repository } from 'typeorm';
import {
  AdminSessionEntity,
  type SessionKind,
} from './entities/admin-session.entity';

export interface AuthResult {
  token: string;
  kind: SessionKind;
}

export const SESSION_TTL_MS: Record<SessionKind, number> = {
  full: 30 * 24 * 60 * 60_000,
  setup: 15 * 60_000,
};

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(AdminSessionEntity)
    private readonly sessions: Repository<AdminSessionEntity>,
  ) {}

  async create(kind: SessionKind, now = new Date()): Promise<string> {
    await this.sessions.delete({ expiresAt: LessThan(now) });
    const token = randomBytes(32).toString('hex');
    await this.sessions.save(
      Object.assign(new AdminSessionEntity(), {
        tokenHash: hashToken(token),
        kind,
        createdAt: now,
        lastUsedAt: now,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS[kind]),
      }),
    );
    return token;
  }

  async resolve(
    token: string,
    now = new Date(),
  ): Promise<AdminSessionEntity | null> {
    const session = await this.sessions.findOneBy({
      tokenHash: hashToken(token),
    });
    if (!session || session.expiresAt <= now) return null;
    await this.sessions.update(
      { tokenHash: session.tokenHash },
      { lastUsedAt: now },
    );
    session.lastUsedAt = now;
    return session;
  }

  async revoke(token: string): Promise<void> {
    await this.sessions.delete({ tokenHash: hashToken(token) });
  }

  async revokeAll(): Promise<void> {
    await this.sessions.clear();
  }
}
