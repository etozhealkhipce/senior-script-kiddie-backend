import { createHash } from 'node:crypto';
import { InMemoryRepository } from '../../test/utils/in-memory-repository';
import { AdminSessionEntity } from './entities/admin-session.entity';
import { SESSION_TTL_MS, SessionsService } from './sessions.service';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

describe('SessionsService', () => {
  let repo: InMemoryRepository<AdminSessionEntity>;
  let service: SessionsService;
  const now = new Date('2026-10-09T12:00:00Z');

  beforeEach(() => {
    repo = new InMemoryRepository<AdminSessionEntity>('tokenHash');
    service = new SessionsService(repo.asRepository());
  });

  it('issues a random hex token and stores only its hash', async () => {
    const token = await service.create('full', now);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].tokenHash).toBe(sha256(token));
    expect(repo.rows[0].expiresAt.getTime()).toBe(
      now.getTime() + SESSION_TTL_MS.full,
    );
  });

  it('gives setup sessions 15 minutes', async () => {
    await service.create('setup', now);
    expect(repo.rows[0].expiresAt.getTime() - now.getTime()).toBe(15 * 60_000);
  });

  it('resolves a live session and touches lastUsedAt', async () => {
    const token = await service.create('setup', now);
    const later = new Date(now.getTime() + 1000);
    const session = await service.resolve(token, later);
    expect(session?.kind).toBe('setup');
    expect(repo.rows[0].lastUsedAt).toEqual(later);
  });

  it('returns null for unknown or expired tokens', async () => {
    const token = await service.create('setup', now);
    await expect(service.resolve('nope', now)).resolves.toBeNull();
    const expired = new Date(now.getTime() + SESSION_TTL_MS.setup);
    await expect(service.resolve(token, expired)).resolves.toBeNull();
  });

  it('purges expired sessions when issuing a new one', async () => {
    await service.create('setup', now);
    await service.create(
      'full',
      new Date(now.getTime() + SESSION_TTL_MS.setup + 1),
    );
    expect(repo.rows.map((r) => r.kind)).toEqual(['full']);
  });

  it('revokes one session or all of them', async () => {
    const a = await service.create('full', now);
    const b = await service.create('full', now);
    await service.revoke(a);
    await expect(service.resolve(a, now)).resolves.toBeNull();
    await expect(service.resolve(b, now)).resolves.not.toBeNull();
    await service.revokeAll();
    expect(repo.rows).toHaveLength(0);
  });
});
