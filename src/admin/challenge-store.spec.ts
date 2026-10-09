import { ChallengeStore } from './challenge-store';

describe('ChallengeStore', () => {
  const t0 = 1_000_000;

  it('consumes a challenge exactly once', () => {
    const store = new ChallengeStore();
    store.add('login', 'abc', t0);
    expect(store.consume('login', 'abc', t0 + 1)).toBe(true);
    expect(store.consume('login', 'abc', t0 + 2)).toBe(false);
  });

  it('rejects unknown and expired challenges', () => {
    const store = new ChallengeStore();
    store.add('login', 'abc', t0);
    expect(store.consume('login', 'nope', t0)).toBe(false);
    expect(store.consume('login', 'abc', t0 + ChallengeStore.TTL_MS)).toBe(
      false,
    );
  });

  it('caps the store and drops the oldest entries first', () => {
    const store = new ChallengeStore();
    const total = ChallengeStore.MAX_ENTRIES + 5;
    for (let i = 0; i < total; i++) store.add('login', `c${i}`, t0);
    for (let i = 0; i < 5; i++) {
      expect(store.consume('login', `c${i}`, t0 + 1)).toBe(false);
    }
    expect(store.consume('login', `c${total - 1}`, t0 + 1)).toBe(true);
  });

  it('prunes expired entries at the front and keeps later live ones', () => {
    const store = new ChallengeStore();
    store.add('login', 'old', t0);
    store.add('login', 'live', t0 + 1000);
    store.add('login', 'trigger', t0 + ChallengeStore.TTL_MS + 1);
    const now = t0 + ChallengeStore.TTL_MS + 2;
    expect(store.consume('login', 'old', now)).toBe(false);
    expect(store.consume('login', 'live', now)).toBe(true);
    expect(store.consume('login', 'trigger', now)).toBe(true);
  });

  it('keeps purposes apart', () => {
    const store = new ChallengeStore();
    store.add('register', 'abc', t0);
    expect(store.consume('login', 'abc', t0)).toBe(false);
    expect(store.consume('register', 'abc', t0)).toBe(true);
  });
});
