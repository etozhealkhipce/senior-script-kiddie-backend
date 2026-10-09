import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { SessionKind } from '../../admin/entities/admin-session.entity';
import { SessionsService } from '../../admin/sessions.service';

export const SESSION_KINDS_KEY = 'adminSessionKinds';

/** Session kinds a route accepts; without it only `full` sessions pass. */
export const AllowSessionKinds = (...kinds: SessionKind[]) =>
  SetMetadata(SESSION_KINDS_KEY, kinds);

/** The raw `x-admin-token` header of an already guarded request. */
export const AdminToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<Request>().headers['x-admin-token'] as string,
);

@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = this.reflector.getAllAndOverride<SessionKind[] | undefined>(
      SESSION_KINDS_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? ['full'];
    const token = context.switchToHttp().getRequest<Request>().headers[
      'x-admin-token'
    ];
    const session =
      typeof token === 'string' ? await this.sessions.resolve(token) : null;

    if (!session || !allowed.includes(session.kind)) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    return true;
  }
}
