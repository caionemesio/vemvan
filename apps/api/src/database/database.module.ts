import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';

import type { EnvConfig } from '../config/env.validation.js';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        dialect: 'postgres' as const,
        host: config.get('DB_HOST', { infer: true }),
        port: config.get('DB_PORT', { infer: true }),
        database: config.get('DB_NAME', { infer: true }),
        username: config.get('DB_USER', { infer: true }),
        password: config.get('DB_PASSWORD', { infer: true }),
        dialectOptions: config.get('DB_SSL', { infer: true })
          ? { ssl: { require: true, rejectUnauthorized: false } }
          : {},

        // Schema is owned exclusively by versioned migrations.
        synchronize: false,

        // No domain models exist in this feature.
        autoLoadModels: false,
        models: [],

        // Fail fast: without this the module retries 10x/3s and the process
        // would take ~30s to die when the database is unreachable.
        retryAttempts: 0,

        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
