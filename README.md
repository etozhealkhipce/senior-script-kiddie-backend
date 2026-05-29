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

## Admin token

The admin token lives **in memory** (no file, no env var). It is generated on demand and expires after 24 hours. After a redeploy the pod memory is cleared — just generate a new one.

**Production (k3s):**

```bash
kubectl exec -n sskd deployment/sskd-backend -- \
  wget -qO- --post-data="" "http://localhost:3000/api/admin/token"
```

**Local:**

```bash
curl -X POST http://localhost:3000/api/admin/token
```

Copy the `token` value → paste it in the admin UI login.  
The endpoint is protected by `LocalhostGuard` — only accessible from inside the pod.

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
