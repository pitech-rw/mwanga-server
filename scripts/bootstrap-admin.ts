import 'dotenv/config';
import {
  PERMISSIONS,
  USER_TYPE_NAMES,
  type UserTypeName,
} from '../src/auth/permission-catalog.js';
import { syncRolePermissions } from '../src/auth/sync-role-permissions.js';
import { hashPassword } from '../src/auth/password.js';
import { db } from '../src/prisma/db.js';
import type { UserType } from '../src/prisma/types.js';

function parseBootstrapRoleName(raw: string | undefined): UserTypeName {
  const name = raw ?? 'admin';

  if (!(USER_TYPE_NAMES as readonly string[]).includes(name)) {
    console.error(
      `BOOTSTRAP_ADMIN_ROLE must be one of: ${USER_TYPE_NAMES.join(', ')} (got "${name}")`,
    );
    process.exit(1);
  }

  return name;
}

async function main() {
  await db.connect({ url: process.env['DATABASE_URL']! });

  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    console.error('Set BOOTSTRAP_ADMIN_PASSWORD (min 8 characters) in the environment.');
    process.exit(1);
  }

  const username = process.env.BOOTSTRAP_ADMIN_USERNAME ?? 'admin';
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@mwanga.local').toLowerCase();
  const roleName = parseBootstrapRoleName(process.env.BOOTSTRAP_ADMIN_ROLE);

  const { userCount } = await db.orm.public.User.aggregate((aggregate) => ({
    userCount: aggregate.count(),
  }));

  if (userCount > 0) {
    console.error('Refusing to bootstrap: at least one user already exists.');
    process.exit(1);
  }

  let role = await db.orm.public.Role.first({ name: roleName });

  if (!role) {
    role = await syncRolePermissions(db, roleName, [PERMISSIONS.system.admin]);
    console.log(`Created role "${roleName}" (id ${role.id}).`);
  } else {
    await syncRolePermissions(db, roleName, [PERMISSIONS.system.admin]);
  }

  const passwordHash = await hashPassword(password);

  const user = await db.orm.public.User.include('role').create({
    username,
    firstName: process.env.BOOTSTRAP_ADMIN_FIRST_NAME ?? 'Admin',
    lastName: process.env.BOOTSTRAP_ADMIN_LAST_NAME ?? 'User',
    email,
    type: roleName as UserType,
    roleId: role.id,
    isActive: true,
    passwordHash,
  });

  console.log(`Created admin user "${user.username}" (id ${user.id}).`);
  console.log(`Sign in via POST /auth/login with username "${username}" or email "${email}".`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
