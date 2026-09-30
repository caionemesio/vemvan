import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PRODUCT_NAME } from '@vemvan/shared';

import { AppModule } from './app.module.js';

/** Sequelize wraps driver errors, often with an empty top-level message. */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const parent = (error as { parent?: unknown }).parent;
  const parentMessage =
    parent instanceof Error ? parent.message : undefined;

  return [error.name, error.message || parentMessage]
    .filter((part): part is string => Boolean(part))
    .join(': ');
}

/**
 * Database connectivity is validated explicitly here, before the server starts
 * accepting requests.
 *
 * This check is NOT redundant with SequelizeModule: its connection factory
 * returns early when `autoLoadModels` is false and never authenticates, so
 * without this the API would happily boot with an unreachable database.
 */
async function assertDatabaseConnection(
  sequelize: Sequelize,
): Promise<void> {
  try {
    await sequelize.authenticate();
  } catch (error) {
    const reason = describeError(error);
    console.error(
      `Failed to connect to PostgreSQL at ${process.env.DB_HOST}:${process.env.DB_PORT}. Aborting startup.`,
    );
    console.error(`Reason: ${reason}`);
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { abortOnError: false });

  await assertDatabaseConnection(app.get<Sequelize>(getConnectionToken()));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`${PRODUCT_NAME} API listening on port ${port}`);
}

await bootstrap().catch((error: unknown) => {
  // Any startup failure (invalid configuration, unreachable database) must
  // surface as a non-zero exit code, not a logged error on a "successful" run.
  console.error(`Startup failed: ${describeError(error)}`);
  process.exit(1);
});
