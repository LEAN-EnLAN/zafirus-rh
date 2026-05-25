import { Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OnboardingMockService } from '../../services/onboarding-mock.service';
import { CaseListComponent } from '../../components/case-list/case-list.component';
import { CaseDetailComponent } from '../../components/case-detail/case-detail.component';
import { CandidatePanelComponent } from '../../candidate/candidate-panel/candidate-panel.component';

@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  imports: [CaseListComponent, CaseDetailComponent, CandidatePanelComponent],
  styles: [`
    :host {
      display: block;
      height: 100%;
      min-height: 0;
      width: 100%;
      min-width: 0;
      flex: 1 1 auto;
    }

    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes checkPopIn {
      0% { opacity: 0; transform: scale(0.7); }
      70% { opacity: 1; transform: scale(1.08); }
      100% { opacity: 1; transform: scale(1); }
    }

    @keyframes subtlePulse {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.12); }
    }

    .operative-overlay-enter { animation: overlayFadeIn 220ms ease-out both; }
    .operative-check-enter { animation: checkPopIn 420ms cubic-bezier(0.2, 0.9, 0.2, 1) both; }
    .demo-pulse { animation: subtlePulse 1.8s ease-in-out infinite; }

    @media (prefers-reduced-motion: reduce) {
      .operative-overlay-enter,
      .operative-check-enter,
      .demo-pulse {
        animation: none !important;
      }
    }
  `],
  template: `
    <div class="relative flex h-full min-h-0 min-w-0 w-full flex-1 overflow-hidden">
      @if (svc.wizardMode()) {
        <div class="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-4">
          <div class="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-3 py-1 text-xs text-[var(--text-secondary)] shadow-sm backdrop-blur-sm">
            <span class="demo-pulse inline-block h-2 w-2 rounded-full bg-[var(--status-info)]"></span>
            <span>Demo automática activa</span>
          </div>
        </div>
      }

      <!-- RRHH Panel -->
      <div class="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        <!-- Case list sidebar -->
        @if (!svc.selectedCase() || svc.sidebarOpen()) {
          @if (svc.selectedCase()) {
            <div class="hidden h-full flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--bg-subtle)] md:flex md:w-64 lg:w-[260px]">
              <app-case-list />
            </div>
          } @else {
            <div class="flex h-full w-full flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
              <app-case-list />
            </div>
          }
        }

        <!-- Case detail -->
        @if (svc.selectedCase()) {
            <div class="flex h-full min-w-0 w-full flex-1 flex-col overflow-hidden bg-[var(--bg-base)]">
            <app-case-detail [activeTab]="svc.wizardActiveTab()" />
          </div>
        } @else {
          <div class="hidden h-full min-w-0 w-full flex-1 flex-col overflow-hidden bg-[var(--bg-base)] md:flex">
            <app-case-detail [activeTab]="svc.wizardActiveTab()" />
          </div>
        }
      </div>

      <!-- Candidate panel -->
      @if (svc.isDemo() && svc.selectedCase() && svc.candidateViewOpen()) {
        <div class="hidden min-[1180px]:flex min-[1180px]:w-[clamp(360px,30vw,460px)] min-[1180px]:min-w-[360px] min-[1180px]:max-w-[460px] flex-none shrink-0 flex-col bg-[var(--bg-subtle)] min-h-0 min-w-0 overflow-hidden border-l border-[var(--border-subtle)]">
          <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
            <div class="mb-3 flex items-center justify-end">
              <button
                type="button"
                (click)="svc.setCandidateViewOpen(false)"
                aria-label="Cerrar panel del candidato"
                class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <app-candidate-panel />
          </div>
        </div>
      }

      @if (showOperativeOverlay()) {
        <div class="operative-overlay-enter absolute inset-0 z-30 flex items-center justify-center bg-[var(--bg-base)]/60 p-4 backdrop-blur-[1px]">
          <div class="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center shadow-xl">
            <div class="operative-check-enter mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-success-subtle)] text-[var(--status-success)]">
              <svg viewBox="0 0 24 24" fill="none" class="h-8 w-8" aria-hidden="true">
                <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </div>
            <p class="text-lg font-semibold text-[var(--text-primary)]">¡Alta completada!</p>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ operativeName() }} está operativo/a</p>
            <button type="button" (click)="dismissOperativeOverlay()" class="mt-4 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">Cerrar</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class OnboardingPageComponent implements OnInit {
  readonly svc = inject(OnboardingMockService);
  readonly showOperativeOverlay = signal(false);
  readonly operativeName = signal('');

  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private overlayTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastTrackedCaseId: string | null = null;
  private lastTrackedStatus: string | null = null;

  private readonly wizardTabSync = effect(() => {
    if (!this.svc.isDemo() || !this.svc.autoRun()) return;

    switch (this.svc.selectedCase()?.status) {
      case 'candidate_invited':
      case 'candidate_submitted':
        this.svc.wizardActiveTab.set('data');
        break;
      case 'hr_review':
      case 'ready_to_activate':
        this.svc.wizardActiveTab.set('overview');
        break;
      case 'active_pending_automation':
        this.svc.wizardActiveTab.set('tasks');
        break;
      default:
        this.svc.wizardActiveTab.set('overview');
        break;
    }
  }, { allowSignalWrites: true });

  private readonly operativeOverlaySync = effect(() => {
    const selected = this.svc.selectedCase();
    const caseId = selected?.id ?? null;
    const status = selected?.status ?? null;

    if (caseId !== this.lastTrackedCaseId) {
      this.lastTrackedCaseId = caseId;
      this.lastTrackedStatus = status;
      return;
    }

    const transitionedToOperative = this.lastTrackedStatus !== 'operative' && status === 'operative';
    this.lastTrackedStatus = status;

    if (!transitionedToOperative || !selected) return;

    this.showOperativeOverlay.set(true);
    this.operativeName.set(`${selected.employee.name} ${selected.employee.lastName}`.trim());

    if (this.overlayTimeoutId) {
      clearTimeout(this.overlayTimeoutId);
    }

    this.overlayTimeoutId = setTimeout(() => {
      this.showOperativeOverlay.set(false);
      this.overlayTimeoutId = null;
    }, 3000);
  }, { allowSignalWrites: true });

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
      const mode = data['mode'];
      const isWorkspace = mode !== 'preview';
      this.svc.setWorkspaceMode(isWorkspace);

      if (isWorkspace) {
        this.svc.ensureWorkspaceState();
      } else {
        this.svc.loadFromStorage();
      }
    });

    this.applyDemoFragment(this.route.snapshot.fragment);

    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(fragment => {
      this.applyDemoFragment(fragment);
    });
  }

  dismissOperativeOverlay(): void {
    this.showOperativeOverlay.set(false);
    if (this.overlayTimeoutId) {
      clearTimeout(this.overlayTimeoutId);
      this.overlayTimeoutId = null;
    }
  }

  applyDemoFragment(fragment: string | null): void {
    if (!this.svc.isDemo()) return;

    const parsed = this.parseDemoFragment(fragment);

    this.svc.ensureDemoSeeded();

    // If fragment contains candidate=TOKEN, try token-based selection first
    const tokenMatched = parsed.token
      ? this.svc.selectCaseByCandidateToken(parsed.token)
      : parsed.candidateToken
        ? this.svc.selectCaseByCandidateToken(parsed.candidateToken)
        : false;

    const selected = parsed.caseId
      ? this.svc.selectCase(parsed.caseId) || tokenMatched
      : tokenMatched;

    if (!selected) {
      this.svc.selectDefaultCase();
    }

    this.svc.setCandidateViewOpen(parsed.forceCandidateView);
  }

  private parseDemoFragment(fragment: string | null): { caseId: string | null; token: string | null; candidateToken: string | null; forceCandidateView: boolean } {
    const normalized = (fragment ?? '').trim().replace(/^#/, '');
    if (!normalized) {
      return { caseId: null, token: null, candidateToken: null, forceCandidateView: false };
    }

    const result: { caseId: string | null; token: string | null; candidateToken: string | null; forceCandidateView: boolean } = {
      caseId: null,
      token: null,
      candidateToken: null,
      forceCandidateView: false,
    };
    const tokens = normalized.split(/[&;]+/).filter(Boolean);

    for (const token of tokens) {
      const [rawKey, ...rest] = token.split('=');
      const key = rawKey.trim().toLowerCase();
      const value = rest.length > 0 ? decodeURIComponent(rest.join('=').trim()) : null;

      if ((key === 'case' || key === 'caseid' || key === 'id') && value) {
        result.caseId = value;
        continue;
      }

      if (key === 'token' && value) {
        result.token = value;
        continue;
      }

      if (key === 'candidate' && value) {
        result.candidateToken = value;
        result.forceCandidateView = true;
        continue;
      }

      if (!value) {
        if (key === 'candidate' || key === 'candidate-panel' || key === 'demo' || key === 'split') {
          result.forceCandidateView = true;
        }
      }
    }

    return result;
  }
}
