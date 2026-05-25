import { Component, effect, EventEmitter, inject, OnDestroy, Output, signal } from '@angular/core';
import { OnboardingMockService } from '../../../services/onboarding-mock.service';
import { CaseStatus, AuditEvent, COUNTRIES, TEAMS, CONTRACT_TYPES, OnboardingTask } from '../../../models/onboarding-case.model';

const JOURNEY_STAGES: { id: CaseStatus; label: string }[] = [
  { id: 'draft',                     label: 'Borrador' },
  { id: 'candidate_invited',         label: 'Formulario enviado' },
  { id: 'candidate_submitted',       label: 'Datos recibidos' },
  { id: 'hr_review',                 label: 'Revisión RRHH' },
  { id: 'ready_to_activate',         label: 'Listo para activar' },
  { id: 'active_pending_automation', label: 'Automatización' },
  { id: 'operative',                 label: 'Operativo' },
];

const ACTION_LABELS: Record<string, string> = {
  case_created: 'Caso creado', candidate_form_sent: 'Formulario enviado al candidato',
  candidate_form_submitted: 'Datos enviados por candidato', review_started: 'Revisión RRHH iniciada',
  correction_requested: 'Corrección solicitada', case_approved: 'Caso aprobado',
  case_activated: 'Activación iniciada', case_blocked: 'Caso bloqueado',
  case_unblocked: 'Caso desbloqueado', case_cancelled: 'Caso cancelado',
  case_operative: 'Caso operativo', task_completed: 'Tarea completada',
  task_failed: 'Tarea fallida', task_skipped: 'Tarea omitida',
  email_approved: 'Correo aprobado', candidate_data_consolidated: 'Datos consolidados',
};

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      height: 100%;
      min-height: 0;
    }
  `],
  template: `
    @if (svc.selectedCase(); as c) {
      <div class="flex w-full min-w-0 flex-col gap-4">
        <!-- Identity header -->
        <div class="flex items-start gap-2.5 lg:gap-3 pb-1">
          <div class="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style="background: var(--section-identity)">
            {{ c.employee.name.charAt(0) }}{{ c.employee.lastName.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2.5 flex-wrap">
              <h2 class="text-lg lg:text-[22px] font-bold leading-tight text-[var(--text-primary)] truncate">
                {{ c.employee.name }} {{ c.employee.lastName }}
              </h2>
              <span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border transition-colors duration-200"
                [style.backgroundColor]="statusBg(c.status)"
                [style.color]="statusColor(c.status)"
                [style.borderColor]="statusColor(c.status) + '33'"
                [style.--status-pulse-highlight]="statusPulseHighlight(c.status)"
                [class.animate-status-pulse]="statusBadgePulse()">
                {{ statusLabel(c.status) }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5 text-xs text-[var(--text-secondary)] flex-wrap">
              <span>{{ c.employee.role }}</span>
              <span class="text-[var(--text-tertiary)]">·</span>
              <span class="uppercase font-mono">{{ teamLabel(c.employee.team) }}</span>
            </div>
            <div class="flex items-center gap-2.5 mt-1.5 text-[11px] text-[var(--text-tertiary)] flex-wrap">
              <span>{{ c.employee.cityId }}, {{ countryName(c.employee.countryId) }}</span>
              <span class="text-[var(--text-tertiary)]">·</span>
              <span>Inicio: {{ formatDate(c.employee.startDate) }}</span>
              <span class="text-[var(--text-tertiary)]">·</span>
                <span class="text-[var(--section-identity)] font-bold uppercase tracking-wider">
                {{ nextStep(c.status, c.candidateData?.consolidated ?? false) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Status banner -->
        @if (c.status === 'blocked' || c.status === 'cancelled' || c.correctionNote) {
          <div class="rounded-xl border p-4 flex items-start gap-3"
            [class]="c.status === 'blocked' ? 'bg-[var(--status-error-subtle)]' : c.status === 'cancelled' ? 'bg-[var(--bg-elevated)]' : 'bg-[var(--status-warning-subtle)]'"
            [style.borderColor]="c.status === 'blocked' ? 'rgba(220,38,38,0.2)' : c.status === 'cancelled' ? 'var(--border-default)' : 'rgba(217,119,6,0.2)'"
          >
            <div class="min-w-0">
              <p class="text-sm font-bold" [style.color]="c.status === 'blocked' ? 'var(--status-error)' : c.status === 'cancelled' ? 'var(--text-primary)' : 'var(--status-warning)'">
                {{ c.status === 'blocked' ? 'Caso bloqueado' : c.status === 'cancelled' ? 'Caso cancelado' : 'Corrección solicitada al candidato' }}
              </p>
              @if (c.blockReason && c.status === 'blocked') { <p class="text-xs text-[var(--text-secondary)] mt-1">{{ c.blockReason }}</p> }
              @if (c.correctionNote && c.status !== 'blocked' && c.status !== 'cancelled') { <p class="text-xs text-[var(--text-secondary)] mt-1">{{ c.correctionNote }}</p> }
            </div>
          </div>
        }

        <div class="grid flex-1 items-start min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]">
          <!-- Journey -->
          <section class="flex min-h-0 w-full min-w-0 flex-col self-start rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <div class="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
              <h3 class="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Trayecto del caso</h3>
              <span class="text-[11px] font-medium text-[var(--text-tertiary)]">Paso {{ currentIndex(c.status, c.auditLog) + 1 }} de {{ journeyStages.length }}</span>
            </div>
            <ol class="relative">
              @for (stage of journeyStages; track stage.id; let i = $index; let last = $last) {
                <li class="relative flex items-start pb-4 last:pb-0">
                  @if (!last) {
                    <span class="absolute left-2.5 top-5 bottom-0 w-px -ml-px"
                      [class]="i < currentIndex(c.status, c.auditLog) || (c.status === 'operative' && i <= currentIndex(c.status, c.auditLog)) ? 'bg-[var(--section-identity)]' : 'bg-[var(--border-subtle)]'"
                    ></span>
                  }
                  <div class="relative flex items-center justify-center w-5 h-5 rounded-full bg-[var(--bg-elevated)] z-10 flex-shrink-0 mr-2.5">
                    @if (i < currentIndex(c.status, c.auditLog) || (c.status === 'operative' && last)) {
                      <svg class="w-4 h-4 text-[var(--section-identity)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    } @else if (i === currentIndex(c.status, c.auditLog) && c.status !== 'operative') {
                      <span class="w-2.5 h-2.5 rounded-full bg-[var(--section-identity)] ring-4 ring-[var(--section-identity-subtle)]"></span>
                    } @else {
                      <span class="w-2 h-2 rounded-full border-2 border-[var(--border-default)]"></span>
                    }
                  </div>
                  <div class="flex-1 min-w-0 pt-0.5">
                    <p class="text-sm"
                      [class]="i === currentIndex(c.status, c.auditLog) && c.status !== 'operative' ? 'text-[var(--section-identity)] font-bold'
                        : (i < currentIndex(c.status, c.auditLog) || (c.status === 'operative' && last)) ? 'text-[var(--text-primary)] font-medium'
                        : 'text-[var(--text-secondary)] font-medium'"
                    >{{ stage.label }}</p>
                    @if (i === currentIndex(c.status, c.auditLog) && c.status !== 'operative') {
                      <p class="text-[11px] uppercase tracking-wider font-semibold text-[var(--section-identity)] mt-0.5">Etapa actual</p>
                    }
                  </div>
                </li>
              }
            </ol>
          </section>

          @if (c.status === 'operative') {
            <div class="flex flex-col items-center justify-center py-10 px-4 bg-[var(--status-success-subtle)] rounded-xl border border-[var(--status-success)]/20">
              <svg class="w-12 h-12 text-[var(--status-success)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-sm font-bold text-[var(--status-success)]">Alta completada</p>
              <p class="text-xs text-[var(--text-secondary)] mt-1">El colaborador ya está activo en Zafirus Technologies.</p>
            </div>
          }

          <!-- Right: next + recent -->
          <aside class="grid min-w-0 w-full gap-4 md:grid-cols-2 lg:grid-cols-1">
            <div class="flex min-w-0 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 self-start">
              <h3 class="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Siguiente hito</h3>
              <p class="text-sm font-semibold text-[var(--text-primary)] leading-snug">{{ milestone(c.status, hasFailedTasks(c.tasks)) }}</p>
              @if (c.status === 'operative') {
                <p class="text-xs text-[var(--status-success)] mt-1.5 font-medium">El alta operativa fue completada.</p>
              }
            </div>

            <div class="flex min-w-0 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 self-start">
              <div class="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
                <h3 class="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Actividad reciente</h3>
                <button (click)="navigateTo.emit('audit')" class="text-[10px] font-semibold text-[var(--section-identity)] uppercase tracking-wider hover:underline">
                  Ver auditoría completa →
                </button>
              </div>
              @if (recentEvents(c.auditLog).length === 0) {
                <p class="text-sm text-[var(--text-tertiary)]">Sin actividad registrada</p>
              } @else {
                <ul class="relative pl-4">
                  @for (ev of recentEvents(c.auditLog); track ev.id; let i = $index) {
                    <li class="relative pb-3 last:pb-0">
                      @if (i < recentEvents(c.auditLog).length - 1) {
                        <span class="absolute bg-[var(--border-subtle)]" style="left: -11px; top: 11px; bottom: -3px; width: 1px"></span>
                      }
                      <span class="absolute z-10 rounded-full border-2 border-[var(--border-default)] bg-[var(--bg-base)]" style="left: -15px; top: 4px; width: 7px; height: 7px"></span>
                      <p class="text-sm font-medium text-[var(--text-primary)]">{{ actionLabel(ev.action) }}</p>
                      <div class="flex items-center gap-2 mt-1 flex-wrap">
                        <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
                          [class]="ev.actorType === 'system' ? 'bg-[var(--status-success-subtle)] text-[var(--status-success)]'
                            : ev.actorId === 'candidate' ? 'bg-[var(--status-info-subtle)] text-[var(--status-info)]'
                            : 'bg-[var(--section-identity-subtle)] text-[var(--section-identity)]'"
                        >{{ ev.actorType === 'system' || ev.actorType === 'integration' ? 'Sistema' : ev.actorId === 'candidate' ? 'Candidato' : 'RRHH' }}</span>
                        <span class="text-xs text-[var(--text-tertiary)]">{{ relativeTime(ev.timestamp) }}</span>
                      </div>
                    </li>
                  }
                </ul>
              }
            </div>
          </aside>
        </div>
      </div>
    }
  `,
})
export class OverviewTabComponent implements OnDestroy {
  readonly svc = inject(OnboardingMockService);
  @Output() navigateTo = new EventEmitter<string>();

  readonly journeyStages = JOURNEY_STAGES;
  readonly statusBadgePulse = signal(false);

  private lastStatus: CaseStatus | null = null;
  private pulseFrameId: number | null = null;
  private pulseTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const status = this.svc.selectedCase()?.status ?? null;

      if (status === null) {
        this.lastStatus = null;
        return;
      }

      if (this.lastStatus !== null && status !== this.lastStatus) {
        this.restartStatusPulse();
      }

      this.lastStatus = status;
    }, { allowSignalWrites: true });
  }

  statusLabel(s: CaseStatus): string {
    const m: Record<string, string> = { draft: 'Borrador', candidate_invited: 'Invitado', candidate_submitted: 'Enviado', hr_review: 'En revisión', ready_to_activate: 'Listo', active_pending_automation: 'Procesando', operative: 'Operativo', blocked: 'Bloqueado', cancelled: 'Cancelado' };
    return m[s] || s;
  }
  statusColor(s: CaseStatus): string {
    const m: Record<string, string> = { draft: 'var(--section-agenda)', blocked: 'var(--status-error)', operative: 'var(--status-success)', cancelled: 'var(--section-agenda)', hr_review: 'var(--status-warning)', active_pending_automation: 'var(--status-warning)' };
    return m[s] || 'var(--status-info)';
  }
  statusBg(s: CaseStatus): string {
    const m: Record<string, string> = { draft: 'var(--section-agenda-subtle)', operative: 'var(--status-success-subtle)', blocked: 'var(--status-error-subtle)', hr_review: 'var(--status-warning-subtle)', active_pending_automation: 'var(--status-warning-subtle)', cancelled: 'var(--section-agenda-subtle)' };
    return m[s] || 'var(--status-info-subtle)';
  }

  statusPulseHighlight(s: CaseStatus): string {
    const m: Record<string, string> = {
      draft: 'rgba(69,156,219,0.18)',
      candidate_invited: 'rgba(2,132,199,0.18)',
      candidate_submitted: 'rgba(2,132,199,0.18)',
      hr_review: 'rgba(217,119,6,0.18)',
      ready_to_activate: 'rgba(69,156,219,0.18)',
      active_pending_automation: 'rgba(217,119,6,0.18)',
      operative: 'rgba(22,163,74,0.18)',
      blocked: 'rgba(220,38,38,0.18)',
      cancelled: 'rgba(148,163,184,0.18)',
    };

    return m[s] || 'rgba(69,156,219,0.18)';
  }
  teamLabel(t: string): string { return TEAMS.find(x => x.value === t)?.label || t; }
  countryName(c: string): string { return COUNTRIES.find(x => x.code === c)?.name || c; }
  formatDate(d: string): string { return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { dateStyle: 'medium' }); }

  nextStep(status: CaseStatus, consolidated: boolean): string {
    const m: Record<string, string> = {
      draft: 'Paso: Enviar formulario', candidate_invited: 'Paso: Esperando candidato',
      candidate_submitted: 'Paso: Iniciar revisión', ready_to_activate: 'Paso: Activar el espacio de trabajo',
      active_pending_automation: 'Paso: Tareas en curso', operative: 'Paso: Colaborador activo',
      blocked: 'Paso: Resolver bloqueo', cancelled: 'Paso: Caso archivado',
    };
    if (status === 'hr_review') return consolidated ? 'Paso: Aprobar alta' : 'Paso: Consolidar datos';
    return m[status] || '';
  }

  hasFailedTasks(tasks: OnboardingTask[]): boolean { return tasks.some(t => t.status === 'failed'); }

  milestone(status: CaseStatus, hasFailed: boolean): string {
    const m: Record<string, string> = {
      draft: 'Enviar formulario al candidato', candidate_invited: 'Esperar respuesta del candidato',
      candidate_submitted: 'Revisar datos enviados', hr_review: 'Consolidar datos y aprobar caso',
      ready_to_activate: 'Iniciar activación', operative: 'Caso operativo',
      blocked: 'Resolver bloqueo para retomar el alta', cancelled: 'Caso cancelado',
    };
    if (status === 'active_pending_automation') return hasFailed ? 'Resolver tareas con atención' : 'Automatización en curso';
    return m[status] || 'Sin acciones pendientes';
  }

  currentIndex(status: CaseStatus, auditLog: AuditEvent[]): number {
    const idx = JOURNEY_STAGES.findIndex(s => s.id === status);
    if (idx !== -1) return idx;
    return 0;
  }

  recentEvents(log: AuditEvent[]): AuditEvent[] {
    return [...log].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }

  actionLabel(action: string): string { return ACTION_LABELS[action] || 'Acción registrada'; }

  relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  }

  ngOnDestroy(): void {
    if (this.pulseFrameId !== null) {
      cancelAnimationFrame(this.pulseFrameId);
    }

    if (this.pulseTimeoutId !== null) {
      clearTimeout(this.pulseTimeoutId);
    }
  }

  private restartStatusPulse(): void {
    if (this.pulseFrameId !== null) {
      cancelAnimationFrame(this.pulseFrameId);
      this.pulseFrameId = null;
    }

    if (this.pulseTimeoutId !== null) {
      clearTimeout(this.pulseTimeoutId);
      this.pulseTimeoutId = null;
    }

    this.statusBadgePulse.set(false);
    this.pulseFrameId = requestAnimationFrame(() => {
      this.statusBadgePulse.set(true);
      this.pulseTimeoutId = setTimeout(() => {
        this.statusBadgePulse.set(false);
        this.pulseTimeoutId = null;
      }, 420);
      this.pulseFrameId = null;
    });
  }
}
