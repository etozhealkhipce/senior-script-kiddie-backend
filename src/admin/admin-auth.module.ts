import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminTokenGuard } from '../common/guards/admin-token.guard';
import { AdminAccountService } from './admin-account.service';
import { AdminAuthController } from './admin-auth.controller';
import { ChallengeStore } from './challenge-store';
import { AdminAccountEntity } from './entities/admin-account.entity';
import { AdminPasskeyEntity } from './entities/admin-passkey.entity';
import { AdminSessionEntity } from './entities/admin-session.entity';
import { LoginLimiter } from './login-limiter';
import { PasskeysService } from './passkeys.service';
import { SessionsService } from './sessions.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminAccountEntity,
      AdminPasskeyEntity,
      AdminSessionEntity,
    ]),
  ],
  controllers: [AdminAuthController],
  providers: [
    AdminAccountService,
    PasskeysService,
    SessionsService,
    LoginLimiter,
    ChallengeStore,
    AdminTokenGuard,
  ],
  exports: [SessionsService],
})
export class AdminAuthModule {}
