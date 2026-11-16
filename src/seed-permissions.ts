import 'dotenv/config';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from './auth/permission-catalog.js';
import { syncAllDefaultRolePermissions } from './auth/sync-role-permissions.js';
import { db } from './prisma/db.js';

async function main() {
  await db.connect({ url: process.env['DATABASE_URL']! });
  await syncAllDefaultRolePermissions(db);

  console.log('Synced default roles and permissions:');
  for (const roleName of Object.keys(DEFAULT_ROLE_PERMISSIONS)) {
    console.log(`  - ${roleName}`);
  }

  const catalogSize = Object.values(PERMISSIONS).flatMap((group) => Object.values(group)).length;
  console.log(`Catalog defines ${catalogSize} permission strings.`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
