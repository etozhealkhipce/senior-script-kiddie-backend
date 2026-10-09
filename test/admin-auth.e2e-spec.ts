import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AdminAuthModule } from '../src/admin/admin-auth.module';
import { generateTotpCode } from '../src/admin/crypto/totp';
import { NotesModule } from '../src/notes/notes.module';

const E2E_DB = 'sskd_admin_auth_e2e';

try {
  process.loadEnvFile('.env');
} catch {
  // CI or a machine without .env: rely on the environment.
}

const connection = {
  type: 'postgres' as const,
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
};

async function ensureDatabase(): Promise<void> {
  const admin = new DataSource({ ...connection, database: 'postgres' });
  await admin.initialize();
  const rows: unknown[] = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [E2E_DB],
  );
  if (rows.length === 0) await admin.query(`CREATE DATABASE ${E2E_DB}`);
  await admin.destroy();
}

type AuthBody = { token: string; kind: string };
type SecretBody = { secret: string };

describe('Admin auth (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    await ensureDatabase();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          ...connection,
          database: E2E_DB,
          synchronize: true,
          dropSchema: true,
          autoLoadEntities: true,
        }),
        AdminAuthModule,
        NotesModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs the whole flow: admin123 → setup → full access → code replay blocked', async () => {
    await http().post('/api/admin/token').expect(404);

    const setupLogin = await http()
      .post('/api/admin/auth/login')
      .send({ password: 'admin123' })
      .expect(200);
    expect((setupLogin.body as AuthBody).kind).toBe('setup');
    const setupToken: string = (setupLogin.body as AuthBody).token;

    await http()
      .get('/api/admin/validate')
      .set('x-admin-token', setupToken)
      .expect(401);
    await http()
      .post('/api/notes')
      .set('x-admin-token', setupToken)
      .send({ slug: 'e2e-note', title: 'E2E', preview: 'p' })
      .expect(401);

    const setup = await http()
      .get('/api/admin/auth/setup')
      .set('x-admin-token', setupToken)
      .expect(200);
    const secret: string = (setup.body as SecretBody).secret;
    const again = await http()
      .get('/api/admin/auth/setup')
      .set('x-admin-token', setupToken)
      .expect(200);
    expect((again.body as SecretBody).secret).toBe(secret);

    const now = Date.now();
    const full = await http()
      .post('/api/admin/auth/setup')
      .set('x-admin-token', setupToken)
      .send({
        newPassword: 'correct-horse-1',
        code: generateTotpCode(secret, now),
      })
      .expect(200);
    expect((full.body as AuthBody).kind).toBe('full');
    const fullToken: string = (full.body as AuthBody).token;

    await http()
      .get('/api/admin/validate')
      .set('x-admin-token', setupToken)
      .expect(401);
    await http()
      .get('/api/admin/validate')
      .set('x-admin-token', fullToken)
      .expect(200);
    await http()
      .post('/api/notes')
      .set('x-admin-token', fullToken)
      .send({ slug: 'e2e-note', title: 'E2E', preview: 'p' })
      .expect(201);
    await http()
      .get('/api/admin/auth/passkeys')
      .set('x-admin-token', fullToken)
      .expect(200, []);

    await http()
      .post('/api/admin/auth/login')
      .send({ password: 'admin123' })
      .expect(401);
    await http()
      .post('/api/admin/auth/login')
      .send({
        password: 'correct-horse-1',
        code: generateTotpCode(secret, now),
      })
      .expect(401);
    const relogin = await http()
      .post('/api/admin/auth/login')
      .send({
        password: 'correct-horse-1',
        code: generateTotpCode(secret, now + 30_000),
      })
      .expect(200);
    expect((relogin.body as AuthBody).kind).toBe('full');

    await http()
      .post('/api/admin/auth/logout-all')
      .set('x-admin-token', fullToken)
      .expect(204);
    await http()
      .get('/api/admin/validate')
      .set('x-admin-token', (relogin.body as AuthBody).token)
      .expect(401);
  });
});
