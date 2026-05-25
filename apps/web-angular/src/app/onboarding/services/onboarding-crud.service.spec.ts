import { TestBed } from '@angular/core/testing';
import { OnboardingCrudService } from './onboarding-crud.service';
import { OnboardingStateService } from './onboarding-state.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';

describe('OnboardingCrudService', () => {
  let service: OnboardingCrudService;
  let state: OnboardingStateService;

  const validData = {
    firstName: 'Ana', lastName: 'Pérez', personalEmail: 'ana@mail.com', CI: '20-12345678-6', birthday: '1990-05-10',
    countryId: 'AR', provinceId: 'CABA', cityId: 'CABA', role: 'Dev', team: 'engineering', contractType: 'employee',
    managerName: 'Boss', startDate: '2099-01-10', welcomeMeetingTime: '', welcomeMeetingLink: '', managerMeetingTime: '',
    managerMeetingLink: '', onboardingFolderUrl: '', kitRedesUrl: '',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [OnboardingCrudService, OnboardingStateService, OnboardingWorkflowService] });
    service = TestBed.inject(OnboardingCrudService);
    state = TestBed.inject(OnboardingStateService);
  });

  it('validates mandatory fields', () => {
    expect(service.validateCreateCaseData({ ...validData, firstName: ' ' } as any)).toContain('nombre');
    expect(service.validateCreateCaseData({ ...validData, personalEmail: 'bad' } as any)).toContain('correo');
    expect(service.validateCreateCaseData({ ...validData, startDate: '2000-01-01' } as any)).toContain('pasada');
  });

  it('creates a case and selects it', () => {
    const created = service.createCase(validData as any);
    expect(created.status).toBe('draft');
    expect(state.cases().some(c => c.id === created.id)).toBeTrue();
    expect(state.selectedCaseId()).toBe(created.id);
  });

  it('throws when create data is invalid', () => {
    expect(() => service.createCase({ ...validData, CI: '20-000' } as any)).toThrow();
  });

  it('seeds demo cases when empty', () => {
    expect(state.cases().length).toBe(0);
    service.seedDemo();
    expect(state.cases().length).toBeGreaterThan(0);
  });

  it('selectCase returns false for unknown id', () => {
    expect(service.selectCase('missing')).toBeFalse();
  });
});
