import 'dotenv/config';
import { db } from '../src/prisma/db.js';

async function main() {
  await db.connect({ url: process.env['DATABASE_URL']! });

  const syncRoleName = process.argv.includes('--sync-role-name');
  const users = await db.orm.public.User.include('role').all();

  for (const user of users) {
    const legacyType = user.type as string;

    if (legacyType === 'customer') {
      await db.orm.public.User.where({ id: user.id }).update({ type: 'rider' });
      console.log(`User ${user.id}: customer → rider`);
    }
  }

  if (!syncRoleName) {
    console.log('Done (customer only). Re-run with --sync-role-name after UserType migration.');
    return;
  }

  for (const user of users) {
    const roleName = user.role.name;

    if (user.type === roleName) {
      continue;
    }

    await db.orm.public.User.where({ id: user.id }).update({
      type: roleName as (typeof user)['type'],
    });
    console.log(`User ${user.id}: ${user.type} → ${roleName}`);
  }

  console.log('User.type aligned with Role.name.');
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
