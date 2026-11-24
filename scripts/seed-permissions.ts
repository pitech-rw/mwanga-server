import 'dotenv/config';
import { db } from '../src/prisma/db.js';
import {
  bootstrapDefaultRolePermissions,
  resetDefaultRolePermissions,
} from '../src/auth/sync-role-permissions.js';

async function main() {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  await db.connect({ url });

  const reset = process.argv.includes('--reset-defaults');

  if (reset) {
    await resetDefaultRolePermissions(db);
    console.log('Reset built-in role permissions from DEFAULT_ROLE_PERMISSIONS');
  } else {
    await bootstrapDefaultRolePermissions(db);
    console.log('Bootstrapped default role permissions (roles with zero permissions only)');
  }

}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});