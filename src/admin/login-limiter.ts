import { Injectable } from '@nestjs/common';

// Global (not per-IP) on purpose: there is one admin, and the ingress hides client IPs.
@Injectable()
export class LoginLimiter {
  static readonly MAX_FAILURES = 10;
  static readonly WINDOW_MS = 15 * 60_000;

  private failures: number[] = [];

  isBlocked(now = Date.now()): boolean {
    this.prune(now);
    return this.failures.length >= LoginLimiter.MAX_FAILURES;
  }

  recordFailure(now = Date.now()): void {
    this.prune(now);
    this.failures.push(now);
  }

  reset(): void {
    this.failures = [];
  }

  private prune(now: number): void {
    this.failures = this.failures.filter(
      (t) => now - t < LoginLimiter.WINDOW_MS,
    );
  }
}
