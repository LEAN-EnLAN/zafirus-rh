import { TestBed } from '@angular/core/testing';
import { TasksTabComponent } from './tasks-tab.component';
import { OnboardingMockService } from '../../../services/onboarding-mock.service';

describe('TasksTabComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TasksTabComponent], providers: [OnboardingMockService] }).compileComponents();
    const svc = TestBed.inject(OnboardingMockService);
    svc.ensureDemoSeeded();
    svc.selectDefaultCase();
  });

  it('toggles auto execute flag', () => {
    const svc = TestBed.inject(OnboardingMockService);
    svc.autoExecuteTasks.set(false);
    svc.autoExecuteTasks.set(!svc.autoExecuteTasks());
    expect(svc.autoExecuteTasks()).toBeTrue();
  });

  it('computes progress ring metrics', () => {
    const fixture = TestBed.createComponent(TasksTabComponent);
    const svc = TestBed.inject(OnboardingMockService);
    const c = svc.selectedCase()!;
    c.tasks = [
      { id: '1', type: 'REQUEST_DEVICE' as any, status: 'success', owner: 'it', startedAt: null, completedAt: null, attempts: 1, lastError: null, metadata: {} },
      { id: '2', type: 'REQUEST_DEVICE' as any, status: 'failed', owner: 'it', startedAt: null, completedAt: null, attempts: 1, lastError: 'x', metadata: {} },
    ];
    expect(fixture.componentInstance.percent()).toBe(50);
    expect(fixture.componentInstance.failedCount()).toBe(1);
  });

  it('shows retry/skip for failed tasks in DOM', () => {
    const fixture = TestBed.createComponent(TasksTabComponent);
    const svc = TestBed.inject(OnboardingMockService);
    const c = svc.selectedCase()!;
    c.tasks = [{ id: '2', type: 'REQUEST_DEVICE' as any, status: 'failed', owner: 'it', startedAt: null, completedAt: null, attempts: 1, lastError: 'x', metadata: {} }];
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(html).toContain('Reintentar');
    expect(html).toContain('Omitir');
  });

  it('allDone true when 100 percent', () => {
    const fixture = TestBed.createComponent(TasksTabComponent);
    const svc = TestBed.inject(OnboardingMockService);
    svc.selectedCase()!.tasks = [{ id: '1', type: 'REQUEST_DEVICE' as any, status: 'success', owner: 'it', startedAt: null, completedAt: null, attempts: 1, lastError: null, metadata: {} }];
    expect(fixture.componentInstance.allDone()).toBeTrue();
  });
});
