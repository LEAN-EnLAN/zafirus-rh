import { Component, inject, signal, computed, ViewChild, ElementRef, AfterViewInit, OnDestroy, ViewChildren, QueryList, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import DOMPurify from 'dompurify';
import { OnboardingMockService } from '../../../services/onboarding-mock.service';
import { EmailTemplate } from '../../../models/onboarding-case.model';
import { ZafirusLogoComponent } from '../../../../shared/components/zafirus-logo/zafirus-logo.component';

/**
 * Prototype-safe editable HTML.
 * Production needs stricter sanitization before saving/sending.
 */

type VariableKey =
  | 'firstName' | 'lastName' | 'startDateFormatted' | 'corporateEmail'
  | 'temporaryPassword' | 'onboardingFolderUrl' | 'kitRedesUrl'
  | 'welcomeMeetingTime' | 'welcomeMeetingLink' | 'managerMeetingTime'
  | 'managerName' | 'managerMeetingLink' | 'candidateFormUrl';

interface EmailVariable {
  key: VariableKey;
  label: string;
  group: VariableGroup;
  value: string;
  required?: boolean;
  optional?: boolean;
  demo?: boolean;
  dataTarget?: VariableDataTarget;
}

type SignatureType = 'rrhh' | 'personal';

const VARIABLE_GROUPS = ['Colaborador', 'Acceso', 'Agenda', 'Recursos', 'Firma'] as const;

type VariableGroup = typeof VARIABLE_GROUPS[number];
type VariableDataTarget = 'data-identity' | 'data-location' | 'data-position' | 'data-candidate' | 'data-fiscal' | 'data-payment';

interface EmailStatusCard {
  label: string;
  tone: string;
}

const GROUP_META: Record<VariableGroup, {
  accent: string;
  surface: string;
  border: string;
  description: string;
}> = {
  Colaborador: {
    accent: 'var(--section-identity)',
    surface: 'color-mix(in oklab, var(--section-identity) 8%, var(--bg-elevated))',
    border: 'color-mix(in oklab, var(--section-identity) 24%, var(--border-subtle))',
    description: 'Nombre, apellido y fechas base del caso.',
  },
  Acceso: {
    accent: 'var(--section-location)',
    surface: 'color-mix(in oklab, var(--section-location) 8%, var(--bg-elevated))',
    border: 'color-mix(in oklab, var(--section-location) 24%, var(--border-subtle))',
    description: 'Credenciales y accesos operativos.',
  },
  Agenda: {
    accent: 'var(--section-position)',
    surface: 'color-mix(in oklab, var(--section-position) 8%, var(--bg-elevated))',
    border: 'color-mix(in oklab, var(--section-position) 24%, var(--border-subtle))',
    description: 'Reuniones, responsables y timing.',
  },
  Recursos: {
    accent: 'var(--section-agenda)',
    surface: 'color-mix(in oklab, var(--section-agenda) 8%, var(--bg-elevated))',
    border: 'color-mix(in oklab, var(--section-agenda) 24%, var(--border-subtle))',
    description: 'Links y activos de apoyo.',
  },
  Firma: {
    accent: 'var(--brand-primary)',
    surface: 'color-mix(in oklab, var(--brand-primary) 7%, var(--bg-elevated))',
    border: 'color-mix(in oklab, var(--brand-primary) 22%, var(--border-subtle))',
    description: 'Datos visibles al pie del correo.',
  },
};

@Component({
  selector: 'app-email-tab',
  standalone: true,
  imports: [FormsModule, ZafirusLogoComponent, DatePipe],
  styles: [`
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .animate-fadeIn {
      animation: fadeIn 0.15s ease-out;
    }

    .animate-scaleIn {
      animation: scaleIn 0.15s ease-out;
    }

    .email-preview-body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.7;
      color: #1a1a1a;
    }

    .email-preview-body p {
      margin-bottom: 1em;
    }

    .email-preview-body p:last-child {
      margin-bottom: 0;
    }

    @media (max-width: 768px) {
      .email-tab-body {
        grid-template-columns: 1fr !important;
        overflow-y: auto !important;
      }

      .email-preview-card {
        border-radius: 0 !important;
        border-left: 0 !important;
        border-right: 0 !important;
      }

      .email-preview-body-wrap {
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }

      .email-preview-chrome {
        flex-wrap: wrap !important;
      }

      .email-preview-chrome-actions {
        flex-basis: 100% !important;
        margin-top: 0.75rem;
        margin-left: 3.25rem;
      }
    }
  `],
  template: `
    @if (svc.selectedCase(); as c) {
      <div class="email-tab flex h-full min-h-0 flex-col overflow-hidden">
        <div class="mb-3 flex flex-shrink-0 flex-wrap items-center gap-3">
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-[var(--text-primary)]">Correo de bienvenida</h3>
          </div>

          @if (c.emailTemplate) {
            <span class="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold" [class]="emailStatus().tone">{{ emailStatus().label }}</span>

            @if (c.emailTemplate.status === 'sent' && c.emailTemplate.sentAt) {
              <span class="text-[11px] text-[var(--text-tertiary)]">{{ formatShortDate(c.emailTemplate.sentAt) }}</span>
            } @else if (c.emailTemplate.status === 'scheduled' && c.emailTemplate.scheduledFor) {
              <span class="text-[11px] text-[var(--text-tertiary)]">{{ formatShortDate(c.emailTemplate.scheduledFor) }}</span>
            }

            <div class="ml-auto flex items-center gap-3">
              <button type="button" (click)="openEmailActions()"
                class="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                aria-label="Abrir acciones del correo"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="w-4 h-4" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                Acciones
              </button>

              <div class="flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-0.5">
                <button type="button" (click)="setMode('edit')"
                  class="rounded-md px-2 py-1 text-[11px] font-medium"
                  [class]="mode() === 'edit' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'"
                >Editar</button>
                <button type="button" (click)="setMode('preview')"
                  class="rounded-md px-2 py-1 text-[11px] font-medium"
                  [class]="mode() === 'preview' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'"
                >Previsualizar</button>
              </div>
            </div>

            @if (emailActionsOpen()) {
              <div class="fixed inset-0 z-50 flex items-center justify-center p-4" (click)="closeEmailActions()">
                <div class="absolute inset-0 bg-black/30 animate-fadeIn"></div>
                <div class="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 shadow-2xl animate-scaleIn" (click)="$event.stopPropagation()">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h4 class="text-sm font-bold text-[var(--text-primary)]">Envío de correo</h4>
                      <p class="mt-1 text-xs text-[var(--text-tertiary)]">Gestioná el envío desde este panel.</p>
                    </div>

                    <button type="button" (click)="closeEmailActions()"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      aria-label="Cerrar"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </div>

                  <div class="mt-4 space-y-4">
                    <div class="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-3">
                      <div>
                        <p class="text-sm font-semibold text-[var(--text-primary)]">Envío automático</p>
                        <p class="text-xs text-[var(--text-tertiary)]">Activa el envío automático para este correo.</p>
                      </div>

                      <button type="button" role="switch" [attr.aria-checked]="svc.autoSendEmail()"
                        (click)="toggleAutoSend()"
                        class="relative inline-flex h-5 w-10 flex-shrink-0 items-center rounded-full transition-colors"
                        [class]="svc.autoSendEmail() ? 'bg-[var(--brand-primary)]' : 'bg-[var(--border-default)]'"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                          [class.translate-x-5]="svc.autoSendEmail()"
                        ></span>
                      </button>
                    </div>

                    @if (emailConfirmOpen()) {
                      <div class="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <h5 class="text-sm font-semibold text-[var(--text-primary)]">¿Enviar correo a {{ c.employee.email }}?</h5>
                        <p class="mt-1 text-xs text-[var(--text-tertiary)]">Esta acción enviará el correo ahora mismo.</p>

                        <div class="mt-4 flex items-center gap-3">
                          <button type="button" (click)="cancelEmailSendConfirmation()"
                            class="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--text-primary)]"
                          >Cancelar</button>
                          <button type="button" (click)="confirmEmailSend()"
                            class="flex-1 rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-primary-hover)]"
                          >Confirmar</button>
                        </div>
                      </div>
                    } @else {
                      @if (c.emailTemplate.status === 'draft' && svc.autoSendEmail()) {
                        <div class="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                          <div class="mb-3">
                            <h5 class="text-sm font-semibold text-[var(--text-primary)]">Programar envío</h5>
                            <p class="mt-1 text-xs text-[var(--text-tertiary)]">Elegí una fecha futura para dejarlo listo.</p>
                          </div>

                          <div class="space-y-3">
                            <input type="date" [attr.min]="todayDate()" [attr.aria-invalid]="!!scheduleError()" [style.borderColor]="scheduleError() ? 'var(--status-error)' : null" [value]="scheduleDate()"
                              (input)="onScheduleChange($event)"
                              class="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]" />
                            @if (scheduleError()) {
                              <p class="text-xs font-medium text-[var(--status-error)]" role="alert">{{ scheduleError() }}</p>
                            }
                            <button type="button" (click)="handleSchedule()" [disabled]="!isScheduleValid()"
                              class="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--brand-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                            >Programar envío</button>
                          </div>
                        </div>
                      } @else if (c.emailTemplate.status === 'draft') {
                        <button type="button" (click)="openEmailSendConfirmation()"
                          class="w-full rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-primary-hover)]"
                        >Enviar ahora</button>
                      }

                      @if (c.emailTemplate.status === 'sent') {
                        <button type="button" (click)="handleSendNow()"
                          class="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                        >Reenviar</button>
                      }

                      @if (c.emailTemplate.status === 'scheduled') {
                        <button type="button" (click)="handleCancelSchedule()"
                          class="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--status-error)]"
                        >Cancelar envío</button>
                      }
                    }

                    <div class="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Estado</p>
                      <p class="mt-1 text-sm font-semibold text-[var(--text-primary)]">{{ emailStatus().label }}</p>
                    </div>

                    <button type="button" (click)="closeEmailActions()"
                      class="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >Cerrar</button>
                  </div>
                </div>
              </div>
            }
          } @else {
            <div class="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in oklab, var(--brand-primary) 24%, var(--border-default))] bg-[var(--brand-primary-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)] shadow-sm ml-auto">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8.5h18m-16.5-5h15A1.5 1.5 0 0 1 21 5v14a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19V5A1.5 1.5 0 0 1 4.5 3.5Zm0 0 7.5 6 7.5-6" />
              </svg>
              Elegí una plantilla
            </div>
          }
        </div>

      @if (showPreview()) {
      <!-- Preview mode: Gmail-style email client -->
      <div class="flex-1 min-h-0 overflow-y-auto flex justify-center p-4 lg:p-6 bg-[#f5f5f5]">
        <div class="w-full max-w-[680px] bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden email-preview-card">

          <!-- Email client chrome (Gmail reading pane header) -->
          <div class="px-5 pt-5 pb-3 border-b border-gray-100">

            <div class="flex items-start gap-3 mb-4 email-preview-chrome">
              <!-- Avatar circle -->
              <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--brand-primary)]">
                <span class="text-white text-xs font-bold select-none">RH</span>
              </div>

              <div class="flex-1 min-w-0">
                <!-- From -->
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-bold text-gray-900">Recursos Humanos Zafirus</span>
                  <span class="text-xs text-gray-400">&lt;rrhh&#64;zafirus.tech&gt;</span>
                </div>
                <!-- To -->
                <div class="text-xs text-gray-500 mt-0.5">
                  para {{ c.employee.name }} {{ c.employee.lastName }}
                  <span class="text-gray-400">&lt;{{ c.employee.corporateEmail || c.employee.email }}&gt;</span>
                </div>
                <!-- Date -->
                <div class="text-xs text-gray-400 mt-2">
                  {{ now | date:'d MMM. yyyy, HH:mm' }} (UTC-3)
                </div>
              </div>

              <!-- Reply / Forward buttons (visual only) -->
              <div class="flex items-center gap-2 flex-shrink-0 email-preview-chrome-actions">
                <button type="button" class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors cursor-default" tabindex="-1">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                  </svg>
                  Responder
                </button>
                <button type="button" class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors cursor-default" tabindex="-1">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                  Reenviar
                </button>
              </div>
            </div>

            <!-- Subject -->
            <div class="text-base font-semibold text-gray-900 ml-[52px]">
              {{ subject() }}
            </div>
          </div>

          <!-- Email body -->
          <div class="px-6 py-6 lg:px-12 lg:py-8 email-preview-body-wrap">
            <div [innerHTML]="previewHtml()" class="email-preview-body"></div>

            <!-- Professional signature -->
            <div class="mt-8 pt-6 border-t border-gray-200">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="text-sm font-bold text-gray-800">{{ signatureName() }}</p>
                  @if (signatureType === 'rrhh') {
                    <p class="text-xs text-gray-500 mt-0.5">Recursos Humanos | Zafirus Technologies</p>
                  } @else {
                    <p class="text-xs text-gray-500 mt-0.5">{{ c.employee.role }} | Zafirus Technologies</p>
                  }
                  <p class="text-xs text-gray-400 mt-1">+54 11 5555-0000</p>
                  <p class="text-xs font-medium text-[var(--brand-primary)]">www.zafirus.tech</p>
                </div>
                <div class="flex-shrink-0 flex items-center gap-3">
                  <div class="w-0.5 h-10 bg-[var(--brand-primary)]"></div>
                  <div class="bg-[var(--shell-bg)] rounded-lg p-2.5">
                    <app-zafirus-logo [size]="24" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Confidentiality disclaimer -->
            <div class="mt-6 pt-4 border-t border-gray-100">
              <p class="text-[10px] text-gray-400 leading-relaxed">
                Este correo y sus adjuntos son confidenciales y están destinados exclusivamente al destinatario indicado.
                Si lo recibiste por error, por favor eliminalo y avisá al remitente.
              </p>
              <p class="text-[10px] text-gray-400/60 mt-2 italic">
                Este mensaje es generado automáticamente por Zafirus RH.
              </p>
            </div>
          </div>

        </div>
      </div>
          } @else if (c.emailTemplate) {
            <div class="email-tab-body flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style="display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px;">
              <!-- Editor card -->
              <div class="flex-1 min-h-0 bg-[var(--bg-elevated)] border border-[var(--border-focus)] rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div class="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center gap-3 flex-shrink-0">
                <span class="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider w-16">Asunto:</span>
                <input
                  [value]="subject()"
                  (input)="onSubjectChange($event)"
                  [disabled]="c.emailTemplate!.status === 'sent'"
                  class="flex-1 text-sm font-medium text-[var(--text-primary)] bg-transparent outline-none disabled:opacity-60"
                />
              </div>

              <div #editor
                [attr.contenteditable]="c.emailTemplate!.status !== 'sent'"
                (input)="onBodyInput()"
                (click)="onEditorClick($event)"
                class="flex-1 min-h-0 overflow-y-auto p-6 text-sm leading-relaxed text-[var(--text-primary)] outline-none"
                [class.opacity-75]="c.emailTemplate!.status === 'sent'"
              ></div>

              <div class="h-8 px-4 flex items-center border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex-shrink-0">
                <span class="text-[11px] text-[var(--text-tertiary)]">
                  {{ c.emailTemplate!.status === 'sent' ? 'Correo enviado · solo lectura' : 'Editando · ...' }}
                </span>
              </div>
            </div>

              <!-- Variable sidebar -->
              <div class="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl overflow-hidden flex flex-col min-h-0">
                <div class="px-4 py-3 border-b border-[var(--border-subtle)] flex-shrink-0 flex items-start justify-between gap-3">
                  <div>
                    <h4 class="text-xs font-bold text-[var(--text-primary)]">Variables del correo</h4>
                    <p class="text-[10px] text-[var(--text-tertiary)] mt-0.5">Editá los datos o insertalos en el mensaje.</p>
                  </div>
                  <button type="button" (click)="insertAllRequiredVariables()" [disabled]="c.emailTemplate!.status === 'sent'"
                    class="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                    style="border-color: color-mix(in oklab, var(--brand-primary) 24%, var(--border-default));"
                  >
                    Insertar todo
                  </button>
                </div>
                <div class="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
                  @for (group of variableGroups; track group) {
                    @if (variablesByGroup(group).length) {
                      <section class="overflow-hidden rounded-xl border"
                        [style.backgroundColor]="groupMeta(group).surface"
                        [style.borderColor]="groupMeta(group).border"
                        [style.borderLeft]="'1px solid ' + groupMeta(group).accent"
                      >
                        <button type="button" (click)="toggleGroup(group)" class="flex w-full items-start justify-between gap-3 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                          [attr.aria-expanded]="isGroupOpen(group)"
                        >
                          <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                              <h5 class="text-[11px] font-bold uppercase tracking-[0.16em]" [style.color]="groupMeta(group).accent">{{ group }} ({{ groupStats(group).total }})</h5>
                              <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold" [style.borderColor]="groupMeta(group).border" [style.color]="groupMeta(group).accent">
                                {{ groupStats(group).complete }}/{{ groupStats(group).total }} completos
                              </span>
                            </div>
                            <p class="mt-1 text-[10px] leading-snug text-[var(--text-tertiary)]">{{ groupMeta(group).description }}</p>
                          </div>
                          <svg class="mt-0.5 h-4 w-4 flex-shrink-0 transition-transform" [style.color]="groupMeta(group).accent" [class.rotate-180]="!isGroupOpen(group)" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                          </svg>
                        </button>

                        @if (isGroupOpen(group)) {
                          <div class="px-3 pb-3 space-y-2">
                            @for (v of variablesByGroup(group); track v.key) {
                              <div #variableCard [attr.data-variable]="v.key" class="rounded-lg border p-2.5 transition-colors"
                                [class]="selectedVariable() === v.key ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-subtle)] shadow-sm' : 'border-[var(--border-subtle)] bg-[var(--bg-base)]'"
                              >
                                <div class="flex items-start gap-2">
                                  <div class="flex-1 min-w-0">
                                    <label class="block text-[10px] font-semibold text-[var(--text-tertiary)] mb-1">{{ v.label }}</label>
                                    @if (group === 'Firma' && v.key === 'firstName') {
                                      <div class="space-y-2">
                                         <select [(ngModel)]="signatureType" [disabled]="c.emailTemplate!.status === 'sent'"
                                          class="w-full rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]">
                                          <option value="rrhh">Recursos Humanos</option>
                                          <option value="personal">Personal</option>
                                        </select>
                                         <input [value]="v.value" [disabled]="c.emailTemplate!.status === 'sent'"
                                           (input)="onVariableEdit(v.key, $event)"
                                           class="w-full rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                                         />
                                      </div>
                                    } @else {
                                       <input [value]="v.value" [disabled]="c.emailTemplate!.status === 'sent'"
                                        (input)="onVariableEdit(v.key, $event)"
                                        class="w-full rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                                      />
                                    }
                                  </div>
                                  <div class="flex flex-shrink-0 flex-col items-end gap-1">
                                    <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                      [class]="!v.value ? 'bg-[var(--status-error-subtle)] text-[var(--status-error)]'
                                        : v.demo ? 'bg-[var(--status-warning-subtle)] text-[var(--status-warning)]'
                                        : 'bg-[var(--status-success-subtle)] text-[var(--status-success)]'"
                                    >{{ !v.value ? 'Falta dato' : v.demo ? 'Prueba' : v.optional ? 'Opcional' : 'Listo' }}</span>
                                    <div class="flex items-center gap-1">
                                      @if (v.dataTarget) {
                                        <button type="button" (click)="navigateToData(v)"
                                          [attr.aria-label]="'Ir a Datos para ' + v.label"
                                          class="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-[var(--bg-elevated)]"
                                          [style.color]="groupMeta(group).accent"
                                        >
                                          Ir a Datos →
                                        </button>
                                      }
                                       <button type="button" (click)="insertVariable(v.key)" [disabled]="c.emailTemplate!.status === 'sent'"
                                         [attr.aria-label]="'Insertar variable ' + v.label"
                                         class="w-6 h-6 rounded flex items-center justify-center text-[var(--brand-primary)] bg-[var(--brand-primary-subtle)] hover:opacity-80 text-xs font-bold">
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            }
                          </div>
                        }
                      </section>
                    }
                  }
                </div>
              </div>
            </div>
            } @else {
          <div class="flex-1 min-h-0 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
            <div class="mx-auto flex w-full max-w-6xl flex-col items-center gap-6">
              <div class="w-full max-w-2xl rounded-2xl border border-[color-mix(in oklab, var(--brand-primary) 20%, var(--border-default))] bg-[color-mix(in oklab, var(--brand-primary) 4%, var(--bg-elevated))] px-6 py-8 text-center shadow-sm">
                <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]">
                  <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 7.5h16.5A1.75 1.75 0 0 1 22 9.25v5.5A1.75 1.75 0 0 1 20.25 16.5H3.75A1.75 1.75 0 0 1 2 14.75v-5.5A1.75 1.75 0 0 1 3.75 7.5Zm0 0 8.25 6.25L20.25 7.5" />
                  </svg>
                </div>
                <h3 class="text-lg font-bold text-[var(--text-primary)]">Sin plantilla de correo</h3>
                <p class="mt-2 text-sm text-[var(--text-secondary)]">Creá una plantilla para enviar al colaborador.</p>
              </div>

              <div class="w-full">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 class="text-sm font-semibold text-[var(--text-primary)]">Plantillas sugeridas</h4>
                    <p class="mt-1 text-xs text-[var(--text-tertiary)]">Elegí una base y ajustala después con tus datos.</p>
                  </div>
                  <span class="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">3 opciones</span>
                </div>

                <div class="grid gap-4 md:grid-cols-3">
                  @for (template of emailTemplates; track template.id) {
                    <article class="group flex h-full flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-focus)] hover:shadow-md">
                      <div class="mb-3 flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <h5 class="text-sm font-bold text-[var(--text-primary)]">{{ template.title }}</h5>
                          <p class="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary)]">{{ template.tone }}</p>
                        </div>
                        <span class="shrink-0 rounded-full border border-[color-mix(in oklab, var(--brand-primary) 20%, var(--border-subtle))] bg-[var(--brand-primary-subtle)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-primary)]">Sugerida</span>
                      </div>

                      <div class="rounded-xl bg-[var(--bg-subtle)] p-3">
                        <p class="text-xs font-medium text-[var(--text-primary)]">{{ template.previewLines[0] }}</p>
                        <p class="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{{ template.previewLines[1] }}</p>
                      </div>

                      <p class="mt-3 text-xs leading-relaxed text-[var(--text-tertiary)]">{{ template.description }}</p>

                      <button type="button" (click)="useEmailTemplate(template.id)"
                        class="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[var(--brand-primary)] px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                      >
                        Usar esta plantilla
                      </button>
                    </article>
                  }
                </div>
              </div>
            </div>
          </div>
        }

      </div>
    }
  `,
})
export class EmailTabComponent implements AfterViewInit, OnDestroy {
  readonly svc = inject(OnboardingMockService);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('editor') editorRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('variableCard', { read: ElementRef }) variableCardRefs!: QueryList<ElementRef<HTMLElement>>;

  @Output() navigateToTab = new EventEmitter<{ tab: string; targetId?: string }>();

  readonly mode = signal<'edit' | 'preview'>('edit');
  readonly showPreview = computed(() => this.mode() === 'preview');
  readonly selectedVariable = signal<VariableKey | null>(null);
  readonly variableGroups = VARIABLE_GROUPS;
  readonly emailTemplates = this.svc.emailTemplates;
  readonly emailActionsOpen = signal(false);
  readonly emailConfirmOpen = signal(false);
  readonly scheduleOpen = signal(false);
  readonly scheduleDate = signal('');
  readonly scheduleError = signal<string | null>(null);
  readonly emailStatus = computed<EmailStatusCard>(() => {
    const template = this.svc.selectedCase()?.emailTemplate ?? null;
    if (!template) {
      return {
        label: 'Sin correo',
        tone: 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-tertiary)]',
      };
    }

    if (template.status === 'sent') {
      return {
        label: 'Enviado',
        tone: 'border-[var(--status-success-subtle)] bg-[var(--status-success-subtle)] text-[var(--status-success)]',
      };
    }

    if (template.status === 'scheduled') {
      return {
        label: 'Programado',
        tone: 'border-[var(--status-warning-subtle)] bg-[var(--status-warning-subtle)] text-[var(--status-warning)]',
      };
    }

    return {
      label: 'No enviado',
      tone: 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]',
    };
  });
  readonly expandedGroups = signal<Record<VariableGroup, boolean>>({
    Colaborador: true,
    Acceso: true,
    Agenda: true,
    Recursos: true,
    Firma: true,
  });

  signatureType: SignatureType = 'rrhh';
  readonly now = new Date();
  signatureVisibleName = '';
  signatureSubtitleText = 'www.zafirus.tech';

  private _variables = signal<EmailVariable[]>(this._buildInitialVariables());
  private _editorInitialized = false;
  private _scheduleErrorTimer: ReturnType<typeof setTimeout> | null = null;

  // Computed
  readonly subject = computed(() => this.svc.selectedCase()?.emailTemplate?.subject || '');

  ngAfterViewInit(): void {
    this._initEditor();
  }

  ngOnDestroy(): void {
    if (this._scheduleErrorTimer) {
      clearTimeout(this._scheduleErrorTimer);
      this._scheduleErrorTimer = null;
    }
  }

  variablesByGroup(group: VariableGroup): EmailVariable[] {
    return this._variables().filter(v => v.group === group && (this.svc.isDemo() || !v.demo));
  }

  groupMeta(group: VariableGroup) {
    return GROUP_META[group];
  }

  groupStats(group: VariableGroup): { total: number; complete: number } {
    const vars = this.variablesByGroup(group);
    return {
      total: vars.length,
      complete: vars.filter(v => !!v.value && v.value.trim().length > 0).length,
    };
  }

  isGroupOpen(group: VariableGroup): boolean {
    return this.expandedGroups()[group];
  }

  toggleGroup(group: VariableGroup): void {
    this.expandedGroups.update(state => ({ ...state, [group]: !state[group] }));
  }

  navigateToData(variable: EmailVariable): void {
    if (!variable.dataTarget) return;
    this.navigateToTab.emit({ tab: 'data', targetId: variable.dataTarget });
  }

  signatureName(): string {
    if (this.signatureType === 'rrhh') return 'Recursos Humanos';
    return this.signatureVisibleName || 'Nombre visible';
  }

  signatureSubtitle(): string {
    return this.signatureSubtitleText || 'www.zafirus.tech';
  }

  formatShortDate(timestamp: number): string {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(new Date(timestamp));
  }

  todayDate(): string {
    const now = new Date();
    const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 10);
  }

  isScheduleValid(): boolean {
    const date = this.scheduleDate();
    return !!date && date >= this.todayDate();
  }

  onScheduleChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.scheduleDate.set(input.value);
  }

  openEmailActions(): void {
    const c = this.svc.selectedCase();
    if (!c?.emailTemplate) return;

    this._clearScheduleError();
    this.emailConfirmOpen.set(false);
    this.scheduleOpen.set(true);
    this.scheduleDate.set(c.emailTemplate.status === 'scheduled' && c.emailTemplate.scheduledFor
      ? this._toDateInputValue(c.emailTemplate.scheduledFor)
      : this.scheduleDate() || this.todayDate());
    this.emailActionsOpen.set(true);
  }

  closeEmailActions(): void {
    this.emailActionsOpen.set(false);
    this.emailConfirmOpen.set(false);
    this.scheduleOpen.set(false);
    this.scheduleDate.set('');
    this._clearScheduleError();
  }

  toggleAutoSend(): void {
    this.svc.autoSendEmail.set(!this.svc.autoSendEmail());
    this.scheduleOpen.set(false);
    this.emailConfirmOpen.set(false);
  }

  openEmailSendConfirmation(): void {
    this.emailConfirmOpen.set(true);
  }

  cancelEmailSendConfirmation(): void {
    this.emailConfirmOpen.set(false);
  }

  async confirmEmailSend(): Promise<void> {
    await this.handleSendNow();
    this.emailConfirmOpen.set(false);
  }

  async handleSendNow(): Promise<boolean> {
    const c = this.svc.selectedCase();
    if (!c) return false;
    const sent = await this.svc.sendEmail(c.id);
    if (sent) {
      this.closeEmailActions();
    }
    return sent;
  }

  handleCancelSchedule(): void {
    const c = this.svc.selectedCase();
    if (!c) return;

    this.svc.cancelScheduledEmail(c.id);
    this.closeEmailActions();
  }

  handleSchedule(): void {
    const c = this.svc.selectedCase();
    const date = this.scheduleDate();
    if (!c?.emailTemplate || !date) {
      this.svc.addToast('error', 'Fecha inválida', 'Elegí una fecha para programar el correo.');
      return;
    }

    if (date < this.todayDate()) {
      this._showScheduleError('No se puede programar un envío en el pasado.');
      return;
    }

    const scheduledFor = new Date(`${date}T23:59:59.999`).getTime();
    if (Number.isNaN(scheduledFor)) {
      this.svc.addToast('error', 'Fecha inválida', 'Elegí una fecha para programar el correo.');
      return;
    }

    this.svc.scheduleEmail(c.id, scheduledFor);
    this.closeEmailActions();
  }

  private _showScheduleError(message: string): void {
    this.scheduleError.set(message);

    if (this._scheduleErrorTimer) {
      clearTimeout(this._scheduleErrorTimer);
    }

    this._scheduleErrorTimer = setTimeout(() => {
      this.scheduleError.set(null);
      this._scheduleErrorTimer = null;
    }, 3000);
  }

  private _clearScheduleError(): void {
    this.scheduleError.set(null);

    if (this._scheduleErrorTimer) {
      clearTimeout(this._scheduleErrorTimer);
      this._scheduleErrorTimer = null;
    }
  }

  onSubjectChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const c = this.svc.selectedCase();
    if (!c || c.emailTemplate?.status === 'sent') return;
    this.svc.updateEmailTemplate(c.id, { subject: val });
  }

  onBodyInput(): void {
    const c = this.svc.selectedCase();
    if (!c || c.emailTemplate?.status === 'sent' || !this.editorRef?.nativeElement) return;
    this.svc.updateEmailTemplate(c.id, { bodyHtml: this._sanitizeForWorkspace(this.editorRef.nativeElement.innerHTML) });
  }

  onEditorClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('var-pill') || target.closest('.var-pill')) {
      const pill = target.classList.contains('var-pill') ? target : target.closest('.var-pill') as HTMLElement;
      const key = pill?.getAttribute('data-variable');
      if (key) {
        this.selectedVariable.set(key as VariableKey);
        this._openGroupForVariable(key as VariableKey);
        this._scrollVariableIntoView(key as VariableKey);
      }
    }
  }

  onVariableEdit(key: VariableKey, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (this.svc.selectedCase()?.emailTemplate?.status === 'sent') return;
    if (key === 'firstName') {
      this.signatureVisibleName = val;
    }
    this._variables.update(vars => vars.map(v => v.key === key ? { ...v, value: val } : v));
    this._updatePillsInEditor(key, val);
  }

  insertVariable(key: VariableKey): void {
    const v = this._variables().find(x => x.key === key);
    if (!v || !this.editorRef?.nativeElement || this.svc.selectedCase()?.emailTemplate?.status === 'sent') return;

    this._insertHtmlAtCursor(this._buildPillHtml(v) + '&nbsp;');
    this._syncEditorBody();
  }

  insertAllRequiredVariables(): void {
    if (!this.editorRef?.nativeElement || this.svc.selectedCase()?.emailTemplate?.status === 'sent') return;

    const requiredHtml = this._variables()
      .filter(v => v.required && (this.svc.isDemo() || !v.demo))
      .map(v => this._buildPillHtml(v))
      .join('&nbsp;');

    if (!requiredHtml) return;

    this._insertHtmlAtCursor(requiredHtml);
    this._syncEditorBody();
  }

  setMode(m: 'edit' | 'preview'): void {
    this.mode.set(m);
    if (m === 'edit') {
      this._editorInitialized = false;
      setTimeout(() => this._initEditor());
    }
  }

  useEmailTemplate(templateId: string): void {
    const c = this.svc.selectedCase();
    if (!c) return;

    const applied = this.svc.applyEmailTemplate(c.id, templateId);
    if (!applied) return;

    this.selectedVariable.set(null);
    this.scheduleOpen.set(false);
    this.scheduleDate.set('');
    this.setMode('edit');
  }

  /**
   * Resolve body HTML for preview: replace pills with plain text values.
   * Security: strips script tags, on* attributes and runs DOMPurify.
   */
  readonly previewHtml = computed<SafeHtml | string>(() => {
    const c = this.svc.selectedCase();
    if (!c?.emailTemplate?.bodyHtml) return '';
    let html = this._sanitizeForWorkspace(c.emailTemplate.bodyHtml);

    // Strip script tags
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Strip on* event attributes
    html = html.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    // Strip javascript: URLs
    html = html.replace(/javascript\s*:/gi, '');

    // Replace var-pills with plain text
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('.var-pill[data-variable]').forEach(pill => {
      const key = pill.getAttribute('data-variable') as VariableKey;
      const v = this._variables().find(x => x.key === key);
      const text = v?.value || '(falta)';
      pill.replaceWith(document.createTextNode(text));
    });
    // Remove contenteditable attributes
    doc.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));

    const cleanHtml = doc.body.innerHTML;
    const purifiedHtml = DOMPurify.sanitize(cleanHtml);
    return this.sanitizer.bypassSecurityTrustHtml(purifiedHtml);
  });

  private _toDateInputValue(timestamp: number): string {
    const date = new Date(timestamp);
    const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 10);
  }

  // ── Private ──

  private _initEditor(): void {
    if (this._editorInitialized) return;
    const c = this.svc.selectedCase();
    if (c?.emailTemplate && this.editorRef?.nativeElement) {
      // Populate editor with initial HTML, replacing pill text with current variable values
      let html = this._sanitizeForWorkspace(c.emailTemplate.bodyHtml || '');
      this._variables().forEach(v => {
        const regex = new RegExp(`(<span[^>]*data-variable="${v.key}"[^>]*>)[^<]*(</span>)`, 'g');
        html = html.replace(regex, `$1${this._escapeHtml(v.value)}$2`);
      });
      this.editorRef.nativeElement.innerHTML = html;
      this._editorInitialized = true;
    }
  }

  private _updatePillsInEditor(key: VariableKey, value: string): void {
    if (!this.editorRef?.nativeElement || this.svc.selectedCase()?.emailTemplate?.status === 'sent') return;
    const pills = this.editorRef.nativeElement.querySelectorAll(`.var-pill[data-variable="${key}"]`);
    pills.forEach(pill => {
      pill.textContent = value || '(falta)';
      pill.setAttribute('contenteditable', 'false');
    });
    // Sync back
    const c = this.svc.selectedCase();
    if (c) this.svc.updateEmailTemplate(c.id, { bodyHtml: this._sanitizeForWorkspace(this.editorRef.nativeElement.innerHTML) });
  }

  private _insertHtmlAtCursor(html: string): void {
    const editor = this.editorRef.nativeElement;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const frag = document.createDocumentFragment();
      while (temp.firstChild) frag.appendChild(temp.firstChild);
      range.insertNode(frag);
      range.collapse(false);
    } else {
      editor.innerHTML += html;
    }
  }

  private _syncEditorBody(): void {
    const c = this.svc.selectedCase();
    if (!c || !this.editorRef?.nativeElement || c.emailTemplate?.status === 'sent') return;
    this.svc.updateEmailTemplate(c.id, { bodyHtml: this._sanitizeForWorkspace(this.editorRef.nativeElement.innerHTML) });
  }

  private _buildPillHtml(variable: EmailVariable): string {
    return `<span class="var-pill" data-variable="${variable.key}" contenteditable="false">${this._escapeHtml(variable.value || '(falta)')}</span>`;
  }

  private _openGroupForVariable(key: VariableKey): void {
    const variable = this._variables().find(v => v.key === key);
    if (!variable) return;
    if (!this.isGroupOpen(variable.group)) {
      this.toggleGroup(variable.group);
    }
  }

  private _scrollVariableIntoView(key: VariableKey): void {
    window.setTimeout(() => {
      const card = this.variableCardRefs?.toArray().find(ref => ref.nativeElement.dataset['variable'] === key)?.nativeElement;
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  private _escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  private _sanitizeForWorkspace(html: string): string {
    if (this.svc.isDemo()) return html;

    return html
      .replace(/https:\/\/drive\.google\.com\/drive\/folders\/demo/gi, 'https://drive.google.com/drive/folders/onboarding')
      .replace(/https:\/\/drive\.google\.com\/kit-redes-demo/gi, 'https://drive.google.com/kit-redes');
  }

  private _buildInitialVariables(): EmailVariable[] {
    return [
      { key: 'firstName',            label: 'Nombre',                group: 'Colaborador', value: 'Nombre', required: true, dataTarget: 'data-identity' },
      { key: 'lastName',             label: 'Apellido',              group: 'Colaborador', value: 'Apellido', required: true, dataTarget: 'data-identity' },
      { key: 'startDateFormatted',   label: 'Fecha de ingreso',      group: 'Colaborador', value: 'DD/MM/AAAA', required: true, dataTarget: 'data-location' },
      { key: 'corporateEmail',       label: 'Correo corporativo',    group: 'Acceso',      value: 'usuario@zafirus.tech', required: true, dataTarget: 'data-identity' },
      { key: 'temporaryPassword',    label: 'Contraseña temporal',   group: 'Acceso',      value: '************', demo: true },
      { key: 'onboardingFolderUrl',  label: 'Carpeta de onboarding', group: 'Recursos',    value: 'https://drive.google.com/drive/folders/onboarding', optional: true, demo: true },
      { key: 'kitRedesUrl',          label: 'Kit de redes',          group: 'Recursos',    value: 'https://drive.google.com/kit-redes', optional: true, demo: true },
      { key: 'welcomeMeetingTime',   label: 'Horario de RRHH',       group: 'Agenda',      value: 'DD/MM - HH:mm' },
      { key: 'welcomeMeetingLink',    label: 'Enlace de RRHH',        group: 'Agenda',      value: 'meet.google.com/xxxx-xxxx-xxx' },
      { key: 'managerMeetingTime',    label: 'Horario del responsable', group: 'Agenda',    value: 'DD/MM - HH:mm' },
      { key: 'managerName',           label: 'Nombre manager',       group: 'Agenda',      value: 'Nombre y apellido', dataTarget: 'data-position' },
      { key: 'managerMeetingLink',    label: 'Enlace del responsable', group: 'Agenda',   value: 'meet.google.com/xxxx-xxxx-xxx' },
      { key: 'candidateFormUrl',      label: 'Formulario del candidato', group: 'Recursos', value: 'https://zafirustech.com/onboarding/form/...', optional: true },
    ];
  }
}
