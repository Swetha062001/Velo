/**
 * Database CLI — `tsx src/db/cli.ts <command> [--test]`
 *
 *   migrate   apply pending migrations
 *   status    list migrations and their state
 *   seed      insert demo data into an empty database
 *   reset     drop everything, migrate, seed   (development/test only)
 *
 * `--test` targets TEST_DATABASE_URL instead of DATABASE_URL.
 */
import { env, isProduction } from '../config/env.js';
import { dropAllTables, migrate, migrationStatus } from './migrator.js';
import { createPool } from './pool.js';
import { DEV_ACCOUNTS, seed } from './seed.js';

const [command, ...flags] = process.argv.slice(2);
const useTestDb = flags.includes('--test');

const connectionString = useTestDb ? env.TEST_DATABASE_URL : env.DATABASE_URL;
if (!connectionString) {
  console.error('TEST_DATABASE_URL is not set in server/.env.');
  process.exit(1);
}

const dbName = new URL(connectionString).pathname.slice(1);
const pool = createPool(connectionString);

function assertNotProduction(action: string) {
  if (isProduction) throw new Error(`Refusing to ${action} when NODE_ENV=production.`);
}

async function runMigrate() {
  const applied = await migrate(pool);
  console.log(
    applied.length
      ? `Applied ${applied.length} migration(s) to ${dbName}:\n${applied.map((v) => `  ✓ ${v}`).join('\n')}`
      : `${dbName} is up to date.`,
  );
}

async function runSeed() {
  assertNotProduction('seed');
  const summary = await seed(pool);
  console.log(
    `Seeded ${dbName}: ${summary.categories} categories, ${summary.products} products, ` +
      `${summary.variants} variants, ${summary.images} images, ${summary.users} users.`,
  );
  console.log('\nDevelopment accounts (local only):');
  for (const { email, password } of Object.values(DEV_ACCOUNTS)) {
    console.log(`  ${email.padEnd(20)} ${password}`);
  }
}

async function main() {
  switch (command) {
    case 'migrate':
      await runMigrate();
      break;

    case 'status': {
      const statuses = await migrationStatus(pool);
      if (statuses.length === 0) console.log('No migrations found.');
      for (const s of statuses) {
        const when = s.appliedAt ? `  (${s.appliedAt.toISOString()})` : '';
        console.log(`  ${s.state.padEnd(12)} ${s.version}${when}`);
      }
      break;
    }

    case 'seed':
      await runSeed();
      break;

    case 'reset':
      assertNotProduction('reset the database');
      console.log(`Resetting ${dbName}…`);
      await dropAllTables(pool);
      await runMigrate();
      if (!flags.includes('--no-seed')) await runSeed();
      break;

    default:
      console.error('Usage: tsx src/db/cli.ts <migrate|status|seed|reset> [--test] [--no-seed]');
      process.exitCode = 1;
  }
}

try {
  await main();
} catch (err) {
  console.error(`\n✗ ${(err as Error).message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
