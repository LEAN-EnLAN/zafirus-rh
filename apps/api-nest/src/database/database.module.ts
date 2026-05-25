import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get<string>('DATABASE_USER', 'postgres'),
        password: config.get<string>('DATABASE_PASSWORD', 'postgres'),
        database: config.get<string>('DATABASE_NAME', 'zafirus_rh'),
        ssl:
          config.get<string>('DATABASE_SSL', 'false') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        autoLoadEntities: true,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        // IMPORTANT: synchronize MUST be false in production.
        // Use TypeORM migrations for schema changes.
        // Run migrations automatically in production deployments.
        migrationsRun: config.get<string>('NODE_ENV') === 'production',
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
