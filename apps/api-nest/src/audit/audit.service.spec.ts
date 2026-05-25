import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditEvent } from './audit-event.entity';

describe('AuditService', () => {
  const repo = { create: jest.fn(), save: jest.fn(), find: jest.fn() };
  let service: AuditService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ providers: [AuditService, { provide: getRepositoryToken(AuditEvent), useValue: repo }] }).compile();
    service = module.get(AuditService);
  });

  it('log redacts sensitive fields', async () => {
    repo.create.mockImplementation((x) => x);
    repo.save.mockImplementation(async (x) => x);
    const event = await service.log({ caseId: 'case-1', action: 'x', details: { token: 'a', bankAccount: 'b', ok: 'c' } });
    expect(event.details).toEqual({ token: '[REDACTED]', bankAccount: '[REDACTED]', ok: 'c' });
  });
});
