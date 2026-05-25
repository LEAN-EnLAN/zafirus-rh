import { TestBed } from '@angular/core/testing';
import { OverviewTabComponent } from './overview-tab.component';
import { OnboardingMockService } from '../../../services/onboarding-mock.service';

describe('OverviewTabComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OverviewTabComponent], providers: [OnboardingMockService] }).compileComponents();
    const svc = TestBed.inject(OnboardingMockService);
    svc.ensureDemoSeeded();
    svc.selectDefaultCase();
  });

  it('renders timeline header', () => {
    const fixture = TestBed.createComponent(OverviewTabComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Trayecto del caso');
  });

  it('maps status badge labels', () => {
    const fixture = TestBed.createComponent(OverviewTabComponent);
    expect(fixture.componentInstance.statusLabel('draft' as any)).toBe('Borrador');
  });

  it('computes next milestone text', () => {
    const fixture = TestBed.createComponent(OverviewTabComponent);
    expect(fixture.componentInstance.milestone('candidate_submitted' as any, false)).toContain('Iniciar');
  });

  it('returns next step based on consolidation in hr_review', () => {
    const fixture = TestBed.createComponent(OverviewTabComponent);
    expect(fixture.componentInstance.nextStep('hr_review' as any, false)).toContain('Consolidar');
    expect(fixture.componentInstance.nextStep('hr_review' as any, true)).toContain('Aprobar');
  });

  it('detects failed tasks', () => {
    const fixture = TestBed.createComponent(OverviewTabComponent);
    expect(fixture.componentInstance.hasFailedTasks([{ status: 'failed' } as any])).toBeTrue();
  });
});
