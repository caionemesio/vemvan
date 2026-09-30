import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

/**
 * Reports database connectivity. Contract: specs/001-project-foundation/contracts/health.md
 *
 * The response never exposes host, credentials, database name or stack traces.
 */
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  @Get()
  async check(): Promise<{ status: string; database: string }> {
    try {
      // Checked on every call - never a value memoised at boot.
      await this.sequelize.authenticate();
      return { status: 'ok', database: 'connected' };
    } catch {
      throw new HttpException(
        { status: 'error', database: 'disconnected' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
