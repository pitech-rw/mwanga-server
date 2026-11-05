# Mwanga Server 

## API documentation

With the server running (`npm run start:dev`), open:

- Swagger UI: `http://localhost:3005/api/docs`
- OpenAPI JSON: `http://localhost:3005/api/docs-json`

## Authentication

All API routes require a **Bearer JWT** except `GET /health`, `POST /auth/login`, and `POST /auth/signup`.

1. Set `JWT_SECRET` (and optionally `JWT_EXPIRES_IN`) in `.env` — see `.env.example`.
2. If the database has no users yet, create the first admin:

```bash
BOOTSTRAP_ADMIN_PASSWORD='your-password' npm run bootstrap:admin
```

3. Sign in:

```bash
curl -s -X POST http://localhost:3005/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"admin","password":"your-password"}'
```

Or register a **rider** account (returns a token immediately):

```bash
curl -s -X POST http://localhost:3005/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"username":"jane","firstName":"Jane","lastName":"Rider","email":"jane@example.com","password":"your-password"}'
```

Use the returned `accessToken` as `Authorization: Bearer <token>` on other requests.

`GET /auth/me` returns the current profile, permissions, and role. Query `view=persona` (default) or `view=full` controls field visibility. **`User.type` must equal `Role.name`** (same values as seeded roles); misconfigured accounts get **403** on `/auth/me` and login.

Creating users: set **`type` only** (e.g. `swapper`, `office`); `roleId` is resolved from the matching role. Valid types are listed in `USER_TYPE_NAMES` in `permission-catalog.ts`.

User passwords are stored as bcrypt hashes (`passwordHash`). New users must include a `password` on `POST /users`.

## Permissions

Permission strings use `{resource}:{action}` and are stored on each `Role` in the `Permission` table. The canonical list lives in `src/auth/permission-catalog.ts`.

| Resource | Permissions |
|----------|-------------|
| system | `system:admin` (bypasses all checks) |
| users, roles, bikes, cards, batteries, stations, wallets | `{resource}:read`, `:write`, `:delete` |
| swaps | `swaps:read`, `swaps:operate` (assign + complete), `swaps:write`, `swaps:delete`, `swaps:override` (manual assignment override) |

Default roles (synced with `npm run seed:permissions`):

| Role | Intended use |
|------|----------------|
| `admin` | Full access via `system:admin` |
| `office` | Back-office CRM + inventory; read-only on swaps |
| `office_manager` | Office + user admin + destructive CRM/swap admin |
| `swapper` | Station executive workflow + read-only context |
| `agent` | Field agent: rider/card registration (cannot operate swaps) |
| `rider` | Rider self-service: swap history, wallet, stations (own-data scoping TBD) |
| `viewer` | Read-only across resources |

Assign users a **`type`** matching their job; permissions come from the role with the same name. After changing the permission matrix, run `npm run seed:permissions`. To fix legacy rows where `type` ≠ `Role.name`, run `npm run align:user-types -- --sync-role-name`.

How to make changes to the model
0. edit src/prisma/contract.prisma
1. npm run contract:emit
2. npm run migration:plan -- --name commit-message

   If you see `MIGRATION.PLAN_ORIGIN_UNKNOWN`, `migration plan` is offline and needs a starting contract. Either set the `db` ref to the tip of the migration graph (hash from `npx prisma migration list`, usually the `to` of the latest folder under `migrations/app/`), then plan again:

   ```bash
   npx prisma migration ref set db <hash-prefix>
   npm run migration:plan -- --name your-change
   ```

   Or pass `--from` once:

   ```bash
   npm run migration:plan -- --name your-change --from 6d58290
   ```

   Commit `migrations/app/refs/db.json` when the ref changes.

3. Review migrations/app/<timestamp>_<name> (DDL preview in plan output; check ops.json / migration.ts)
4. npm run db:migrate:show then npm run db:migrate
5. npm run db:verify and npm run migration:status



If the planner refuses (rename vs drop, type changes, required fields on existing rows), use flags from prisma migration plan --help: --rename, --delete, --convert, --backfill.

Do not use db update for production if you want versioned migrations; use plan + migrate.

## Quick post-migrate check

npm run db:verify  
npm run migration:status