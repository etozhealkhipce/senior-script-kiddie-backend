import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminAuthService } from '../../admin/admin-auth.service';

@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-admin-token'] as string | undefined;

    if (!token || !this.adminAuthService.isValidToken(token)) {
      throw new UnauthorizedException(
        'Invalid or expired admin token. Run `make token` to generate a new one.',
      );
    }

    return true;
  }
}
