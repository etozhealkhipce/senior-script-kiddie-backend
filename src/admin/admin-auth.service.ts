import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const TOKEN_FILE = path.join(process.cwd(), '.admin-token');

interface StoredToken {
  token: string;
  expiresAt: number; // ms since epoch
}

@Injectable()
export class AdminAuthService {
  /**
   * Validates the token against the on-disk .admin-token file.
   * The file is re-read on every call so tokens generated after startup work.
   */
  isValidToken(token: string): boolean {
    if (!token) return false;
    try {
      const raw = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
      const stored: StoredToken = JSON.parse(raw);
      return stored.token === token && Date.now() < stored.expiresAt;
    } catch {
      return false;
    }
  }
}
