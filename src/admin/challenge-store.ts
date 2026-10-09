import { Injectable } from '@nestjs/common';

export type ChallengePurpose = 'register' | 'login';

// In memory is enough while the backend runs as a single replica.
@Injectable()
export class ChallengeStore {
  static readonly TTL_MS = 5 * 60_000;
  static readonly MAX_ENTRIES = 10_000;

  private readonly expiresAt = new Map<string, number>();

  add(purpose: ChallengePurpose, challenge: string, now = Date.now()): void {
    this.prune(now);
    for (const key of this.expiresAt.keys()) {
      if (this.expiresAt.size < ChallengeStore.MAX_ENTRIES) break;
      this.expiresAt.delete(key);
    }
    this.expiresAt.set(`${purpose}:${challenge}`, now + ChallengeStore.TTL_MS);
  }

  consume(
    purpose: ChallengePurpose,
    challenge: string,
    now = Date.now(),
  ): boolean {
    const key = `${purpose}:${challenge}`;
    const expiresAt = this.expiresAt.get(key);
    this.expiresAt.delete(key);
    return expiresAt !== undefined && expiresAt > now;
  }

  // TTL is constant, so insertion order is expiry order: stop at the first live one.
  private prune(now: number): void {
    for (const [key, expiresAt] of this.expiresAt) {
      if (expiresAt > now) break;
      this.expiresAt.delete(key);
    }
  }
}
