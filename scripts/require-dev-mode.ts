/**
 * One-off alignment scripts must not run against production.
 * Default role permissions are applied on server startup.
 * `bootstrap:admin` is compiled into dist and may run in production; it still refuses once any user exists.
 * npm scripts set NODE_ENV=development; direct invocation must do the same.
 */
export function requireDevMode(scriptLabel: string): void {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();

  if (nodeEnv === 'production') {
    console.error(
      `Refusing to run ${scriptLabel}: disabled when NODE_ENV=production.`,
    );
    process.exit(1);
  }

  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    console.error(
      `Refusing to run ${scriptLabel}: set NODE_ENV=development (or test) before seeding.`,
    );
    console.error('Example: NODE_ENV=development npm run seed:permissions');
    process.exit(1);
  }
}
