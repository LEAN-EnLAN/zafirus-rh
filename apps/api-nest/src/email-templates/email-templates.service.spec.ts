import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplate } from './email-template.entity';
import { makeEmailTemplate } from '../test-utils/fixtures.factory';

describe('EmailTemplatesService', () => {
  const repo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  let service: EmailTemplatesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ providers: [EmailTemplatesService, { provide: getRepositoryToken(EmailTemplate), useValue: repo }] }).compile();
    service = module.get(EmailTemplatesService);
  });

  it('create/update/approve and changedAfterApproval tracking', async () => {
    const t = makeEmailTemplate();
    repo.create.mockImplementation((x) => x);
    repo.save.mockImplementation(async (x) => x);
    repo.findOne.mockResolvedValue(t);

    const created = await service.create('case-1', { subject: 's', bodyHtml: 'b' });
    expect(created.approved).toBe(false);

    const approved = await service.approve('case-1');
    expect(approved.approved).toBe(true);
    expect(approved.changedAfterApproval).toBe(false);

    const updated = await service.update('case-1', { subject: 'new' });
    expect(updated.subject).toBe('new');
    expect(updated.changedAfterApproval).toBe(true);
  });
});
