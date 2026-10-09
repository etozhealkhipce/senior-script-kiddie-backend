# senior-script-kiddie — backend

NestJS API + Admin UI for [sskd.tech](https://sskd.tech).  
Deployed on k3s at `admin.sskd.tech`.

## Stack

- **NestJS** — API (`/api/*`)
- **PostgreSQL** — via TypeORM, `synchronize: true`
- **Admin UI** — Vite React SPA, served as static files by NestJS
- **Uploads** — files at `/uploads/*`, stored on a 5Gi PVC

## Local development

```bash
cp .env.example .env   # fill in POSTGRES_PASSWORD

make db-up             # start Postgres in Docker
make dev               # start NestJS in watch mode
```

Admin UI:

```bash
make install-admin
make build-admin       # or: cd admin-ui && npm run dev
```

## Admin login

- **First start:** the backend creates the admin with password `admin123`. Sign in, set a new
  password and scan the QR code with any TOTP app (Authy, Google Authenticator, Apple Passwords…).
  Until that is done only the setup screen is available.
- **Everyday:** "Sign in with Face ID" (passkey) or password + 6-digit code.
- **Settings page:** add/remove passkeys, change password (needs a code), re-enroll the
  authenticator (needs the password), sign out everywhere.
- **Lost both the password and the authenticator (or the authenticator and every passkey):**
  `make reset-admin` — wipes admin credentials in prod and restarts the pod; sign in with
  `admin123` again. Right after the restart, sign in with `admin123` and finish setup
  immediately — the default password is public until you do.

WebAuthn needs `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` (set in `deploy/values.yml`; locally they
default to `localhost` / `http://localhost:3000`).

## Deploy

**Database** (one-time, or when cluster is reset):  
GitHub Actions → `Deploy Database` → type `deploy`

**Backend** (on every push to `main`):  
Automatic via `.github/workflows/deploy.yml`

## 📊 Headlamp (k8s dashboard)

```bash
kubectl -n default create token sskd-infrastructure-headlamp
```

Open: `http://<SERVER_IP>:30080`

## Makefile targets

```
make dev           start backend in watch mode
make db-up         start Postgres container
make db-down       stop containers
make build         compile TypeScript
make build-admin   build admin UI
make seed          seed example note (TOKEN=xxx make seed)
make test          run unit tests
```
