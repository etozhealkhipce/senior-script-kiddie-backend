import { LoginLimiter } from './login-limiter';

describe('LoginLimiter', () => {
  const t0 = 1_000_000;

  it('blocks after MAX_FAILURES within the window', () => {
    const limiter = new LoginLimiter();
    for (let i = 0; i < LoginLimiter.MAX_FAILURES - 1; i++)
      limiter.recordFailure(t0 + i);
    expect(limiter.isBlocked(t0 + 100)).toBe(false);
    limiter.recordFailure(t0 + 100);
    expect(limiter.isBlocked(t0 + 101)).toBe(true);
  });

  it('unblocks once failures leave the window', () => {
    const limiter = new LoginLimiter();
    for (let i = 0; i < LoginLimiter.MAX_FAILURES; i++)
      limiter.recordFailure(t0);
    expect(limiter.isBlocked(t0 + LoginLimiter.WINDOW_MS - 1)).toBe(true);
    expect(limiter.isBlocked(t0 + LoginLimiter.WINDOW_MS)).toBe(false);
  });

  it('reset clears failures', () => {
    const limiter = new LoginLimiter();
    for (let i = 0; i < LoginLimiter.MAX_FAILURES; i++)
      limiter.recordFailure(t0);
    limiter.reset();
    expect(limiter.isBlocked(t0)).toBe(false);
  });
});
