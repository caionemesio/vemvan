/**
 * Environment validation.
 *
 * Runs at startup so the API fails immediately - naming the offending variable -
 * instead of booting into an inconsistent state.
 */

export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: boolean;
}

const REQUIRED_VARIABLES = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
] as const;

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || String(value).trim() === '';

const toInteger = (name: string, value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid environment variable ${name}: expected a positive integer, received "${String(value)}".`,
    );
  }
  return parsed;
};

export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const missing = REQUIRED_VARIABLES.filter((name) => isBlank(raw[name]));

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy apps/api/.env.example to apps/api/.env and fill in the values.',
    );
  }

  return {
    NODE_ENV: String(raw.NODE_ENV ?? 'development'),
    PORT: toInteger('PORT', raw.PORT ?? 3000),
    DB_HOST: String(raw.DB_HOST),
    DB_PORT: toInteger('DB_PORT', raw.DB_PORT),
    DB_NAME: String(raw.DB_NAME),
    DB_USER: String(raw.DB_USER),
    DB_PASSWORD: String(raw.DB_PASSWORD),
    DB_SSL: String(raw.DB_SSL ?? 'false').toLowerCase() === 'true',
  };
}
