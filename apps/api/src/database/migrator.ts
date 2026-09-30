/**
 * Migration runner (Umzug). Runs outside the Nest application, so it loads and
 * validates the environment on its own.
 *
 * Usage: node src/database/migrator.ts <up|down>
 */
import 'dotenv/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Sequelize } from 'sequelize';
import { SequelizeStorage, Umzug } from 'umzug';

import { validateEnv } from '../config/env.validation.js';

const env = validateEnv(process.env);

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
// Source runs as .ts, compiled output runs as .js.
const migrationExtension = currentFile.endsWith('.ts') ? 'ts' : 'js';

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  dialectOptions: env.DB_SSL
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
  logging: false,
});

export const migrator = new Umzug({
  migrations: {
    glob: join(currentDir, `migrations/*.${migrationExtension}`),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

export type Migration = typeof migrator._types.migration;

async function main(): Promise<void> {
  const command = process.argv[2];

  if (command !== 'up' && command !== 'down') {
    throw new Error(
      `Unknown command "${String(command)}". Expected "up" or "down".`,
    );
  }

  try {
    if (command === 'up') {
      const applied = await migrator.up();
      console.log(
        applied.length === 0
          ? 'No pending migrations.'
          : `Applied ${applied.length} migration(s).`,
      );
    } else {
      const reverted = await migrator.down();
      console.log(
        reverted.length === 0
          ? 'No migrations to revert.'
          : `Reverted ${reverted.length} migration(s).`,
      );
    }
  } finally {
    await sequelize.close();
  }
}

await main();
