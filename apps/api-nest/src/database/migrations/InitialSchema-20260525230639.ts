import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema20260525230639 implements MigrationInterface {
  name = 'InitialSchema20260525230639';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // NOTE: auto-generation requires a live PostgreSQL connection.
    // Run: npm run migration:generate once DATABASE_* env vars point to a running DB.
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // NOTE: generated down migration will be available after regeneration.
  }
}
