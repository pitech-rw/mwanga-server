# Mwanga Server 

## API documentation

With the server running (`npm run start:dev`), open:

- Swagger UI: `http://localhost:3005/api/docs`
- OpenAPI JSON: `http://localhost:3005/api/docs-json`

How to make changes to the model
0. edit src/prisma/contract.prisma
1. npm run contract:emit
2. npm run migration:plan -- --name commit-message
3. Review migrations/app/<timestamp>_<name> (DDL preview in plan output; check ops.json / migration.ts)
4. npm run db:migrate:show then npm run db:migrate
5. npm run db:verify and npm run migration:status



If the planner refuses (rename vs drop, type changes, required fields on existing rows), use flags from prisma migration plan --help: --rename, --delete, --convert, --backfill.

Do not use db update for production if you want versioned migrations; use plan + migrate.

## Quick post-migrate check

npm run db:verify  
npm run migration:status