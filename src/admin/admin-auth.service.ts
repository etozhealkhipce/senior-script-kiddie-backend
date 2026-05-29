import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

interface ActiveToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class AdminAuthService {
  private active: ActiveToken | null = null;

  generate(hours = 24): { token: string; expiresAt: string } {
    const token = randomBytes(16).toString('hex');
    this.active = { token, expiresAt: Date.now() + hours * 3_600_000 };
    return { token, expiresAt: new Date(this.active.expiresAt).toISOString() };
  }

  isValidToken(token: string): boolean {
    if (!this.active) return false;
    return token === this.active.token && Date.now() < this.active.expiresAt;
  }
}
