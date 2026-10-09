import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionsService } from '../../admin/sessions.service';
import { AdminTokenGuard, AllowSessionKinds } from './admin-token.guard';

class Handlers {
  plain() {}
  @AllowSessionKinds('setup')
  setupOnly() {}
}

function context(
  headers: Record<string, unknown>,
  handler: () => void,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    getHandler: () => handler,
    getClass: () => Handlers,
  } as unknown as ExecutionContext;
}

describe('AdminTokenGuard', () => {
  const resolve = jest.fn();
  const guard = new AdminTokenGuard(
    { resolve } as unknown as SessionsService,
    new Reflector(),
  );

  // Keep the original function object: it carries the SetMetadata metadata.
  const handler = (name: 'plain' | 'setupOnly') =>
    Reflect.get(Handlers.prototype, name) as () => void;

  beforeEach(() => resolve.mockReset());

  it('rejects a missing or non-string header without touching the DB', async () => {
    await expect(
      guard.canActivate(context({}, handler('plain'))),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      guard.canActivate(
        context({ 'x-admin-token': ['a', 'b'] }, handler('plain')),
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('rejects unknown tokens', async () => {
    resolve.mockResolvedValue(null);
    await expect(
      guard.canActivate(context({ 'x-admin-token': 'nope' }, handler('plain'))),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('lets only full sessions through by default', async () => {
    resolve.mockResolvedValue({ kind: 'setup' });
    await expect(
      guard.canActivate(context({ 'x-admin-token': 't' }, handler('plain'))),
    ).rejects.toThrow(UnauthorizedException);
    resolve.mockResolvedValue({ kind: 'full' });
    await expect(
      guard.canActivate(context({ 'x-admin-token': 't' }, handler('plain'))),
    ).resolves.toBe(true);
  });

  it('honours AllowSessionKinds', async () => {
    resolve.mockResolvedValue({ kind: 'setup' });
    await expect(
      guard.canActivate(
        context({ 'x-admin-token': 't' }, handler('setupOnly')),
      ),
    ).resolves.toBe(true);
    resolve.mockResolvedValue({ kind: 'full' });
    await expect(
      guard.canActivate(
        context({ 'x-admin-token': 't' }, handler('setupOnly')),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
});
