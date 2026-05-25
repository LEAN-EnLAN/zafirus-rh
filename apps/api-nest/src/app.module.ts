import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { CasesModule } from './cases/cases.module';
import { CandidateSubmissionsModule } from './candidate-submissions/candidate-submissions.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';
import { TasksModule } from './tasks/tasks.module';
import { AuditModule } from './audit/audit.module';
import { SeedModule } from './database/seed.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    EmployeesModule,
    CasesModule,
    CandidateSubmissionsModule,
    EmailTemplatesModule,
    TasksModule,
    AuditModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
