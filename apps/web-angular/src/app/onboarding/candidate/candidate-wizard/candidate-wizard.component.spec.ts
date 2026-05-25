import { TestBed } from '@angular/core/testing';
import { CandidateWizardComponent } from './candidate-wizard.component';
import { OnboardingMockService } from '../../services/onboarding-mock.service';

describe('CandidateWizardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CandidateWizardComponent], providers: [OnboardingMockService] }).compileComponents();
    const svc = TestBed.inject(OnboardingMockService);
    svc.ensureDemoSeeded();
    svc.selectDefaultCase();
  });

  it('advances and goes back between steps', () => {
    const fixture = TestBed.createComponent(CandidateWizardComponent);
    fixture.detectChanges();
    const c = TestBed.inject(OnboardingMockService).selectedCase()!;
    c.candidateData!.taxIdType = 'CUIT'; c.candidateData!.taxIdValue = '20-12345678-6';

    fixture.componentInstance.nextStep();
    expect(c.candidateData!.currentStep).toBe(2);
    fixture.componentInstance.prevStep();
    expect(c.candidateData!.currentStep).toBe(1);
  });

  it('changes payment method', () => {
    const fixture = TestBed.createComponent(CandidateWizardComponent);
    const c = TestBed.inject(OnboardingMockService).selectedCase()!;
    fixture.componentInstance.updateData({ paymentMethod: 'CRYPTO' } as any);
    expect(c.candidateData!.paymentMethod).toBe('CRYPTO');
  });

  it('validates tax id and cbu errors', () => {
    const fixture = TestBed.createComponent(CandidateWizardComponent);
    const c = TestBed.inject(OnboardingMockService).selectedCase()!;
    c.candidateData!.taxIdType = 'CUIT'; c.candidateData!.taxIdValue = 'x';
    c.candidateData!.paymentMethod = 'CBU'; c.candidateData!.cbu = '123';
    expect(fixture.componentInstance.taxIdError()).toBeTruthy();
    expect(fixture.componentInstance.cbuError()).toBeTruthy();
  });

  it('cannot advance when step data is invalid', () => {
    const fixture = TestBed.createComponent(CandidateWizardComponent);
    expect(fixture.componentInstance.canAdvanceStep()).toBeFalse();
  });

  it('can submit only when all required info is complete', () => {
    const fixture = TestBed.createComponent(CandidateWizardComponent);
    const c = TestBed.inject(OnboardingMockService).selectedCase()!;
    c.candidateData!.currentStep = 4;
    c.candidateData!.taxIdType = 'CUIT'; c.candidateData!.taxIdValue = '20-12345678-6';
    c.candidateData!.paymentMethod = 'WIRE';
    c.candidateData!.references = [{ id: '1', fullName: 'A', relationship: 'B', company: 'C', email: 'a@b.com', phone: '1' } as any];
    c.candidateData!.files = [{ id: 'f', fileType: 'dni', name: 'doc', sizeBytes: 1 } as any];
    expect(fixture.componentInstance.canSubmitForm()).toBeTrue();
  });
});
