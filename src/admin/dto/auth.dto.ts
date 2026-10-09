import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';

export class LoginDto {
  @IsString()
  @MaxLength(256)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  code?: string;
}

/** Used by first-time setup and by password change. */
export class NewPasswordDto {
  @IsString()
  @MaxLength(256)
  newPassword: string;

  @IsString()
  @MaxLength(16)
  code: string;
}

export class CurrentPasswordDto {
  @IsString()
  @MaxLength(256)
  currentPassword: string;
}

export class TotpCodeDto {
  @IsString()
  @MaxLength(16)
  code: string;
}

export class PasskeyRegisterDto {
  @IsObject()
  response: RegistrationResponseJSON;

  @IsString()
  @MaxLength(64)
  name: string;
}

export class PasskeyLoginDto {
  @IsObject()
  response: AuthenticationResponseJSON;
}
