import { Component, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OnboardingMockService } from '../../services/onboarding-mock.service';
import { ZafirusLogoComponent } from '../../../shared/components/zafirus-logo/zafirus-logo.component';
import { CandidateData, Reference, TAX_ID_TYPES } from '../../models/onboarding-case.model';
import { formatCuit, isValidEmail as isValidEmailFn, validateCbu, validateCuit } from '../../../shared/utils/cuit-validator';

const STEPS = [
  { id: 1, title: 'Identificación fiscal' },
  { id: 2, title: 'Datos de cobro' },
  { id: 3, title: 'Referencias' },
  { id: 4, title: 'Archivos' },
];

@Component({
  selector: 'app-candidate-wizard',
  standalone: true,
  imports: [FormsModule, ZafirusLogoComponent],
  template: `
    @if (svc.isDemo()) {
      @if (svc.selectedCase(); as c) {
        @if (c.candidateData; as cd) {
        @if (cd.submittedAt) {
          <!-- Submitted state -->
          <div class="h-full flex flex-col items-center justify-center text-center px-6 py-12 bg-[var(--bg-subtle)]">
            <svg class="w-16 h-16 text-[var(--status-success)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h2 class="text-lg font-bold text-[var(--text-primary)] mb-2">Formulario enviado</h2>
            <p class="text-sm text-[var(--text-secondary)] max-w-sm">
              RRHH revisará tus datos y continuará con el alta operativa.
            </p>
          </div>
        } @else {
          <div class="mx-auto w-full max-w-xl min-w-0 overflow-x-hidden px-4 py-6">
            <!-- Welcome header -->
            <div class="flex flex-col items-center justify-center pt-4 pb-4 text-center mb-6">
              <div class="mb-4">
                <app-zafirus-logo [size]="40" />
              </div>
              <h1 class="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Bienvenida/o a Zafirus</h1>
              <p class="text-sm font-medium text-[var(--text-secondary)] mt-2 max-w-sm leading-relaxed">
                Hola, {{ c.employee.name }}. Completá tus datos para avanzar con el alta operativa.
              </p>
            </div>

            <!-- Correction notice -->
            @if (c.correctionNote) {
              <div class="bg-[var(--status-warning-subtle)] border rounded-xl p-5 mb-6 text-left shadow-sm" style="border-color: rgba(217,119,6,0.2)">
                <h3 class="text-sm font-bold text-[var(--status-warning)] mb-1.5">RRHH solicitó una corrección</h3>
                <p class="text-sm text-[var(--text-primary)] font-medium mb-3">Revisá el comentario y actualizá los datos necesarios.</p>
                <div class="bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)]">{{ c.correctionNote }}</div>
              </div>
            }

            <!-- Step indicators -->
            <div class="flex items-center justify-center gap-1 sm:gap-3 mb-8">
              @for (step of steps; track step.id; let i = $index) {
                <div class="flex items-center">
                  <div class="flex flex-col items-center gap-1.5">
                    <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold border"
                      [class]="cd.currentStep === step.id ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm'
                        : cd.completedSteps.includes(step.id) ? 'bg-[var(--status-success-subtle)] text-[var(--status-success)] border-[var(--status-success)]'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border-[var(--border-default)]'"
                    >
                      @if (cd.completedSteps.includes(step.id)) {
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                      } @else { {{ i + 1 }} }
                    </div>
                    <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider hidden sm:block"
                      [class]="cd.currentStep === step.id ? 'text-[var(--brand-primary)]' : cd.completedSteps.includes(step.id) ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'"
                    >{{ step.title }}</span>
                  </div>
                  @if (i < steps.length - 1) {
                    <div class="w-3 sm:w-6 h-[2px] mx-1 sm:mx-2 rounded-full"
                      [class]="cd.completedSteps.includes(step.id) ? 'bg-[var(--status-success)]' : 'bg-[var(--border-subtle)]'"></div>
                  }
                </div>
              }
            </div>

            <!-- Step content -->
            <div class="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-8 shadow-sm mb-6">
              @switch (cd.currentStep) {
                @case (1) {
                  <h2 class="text-xl font-bold text-[var(--text-primary)] mb-1">Identificación fiscal</h2>
                  <p class="text-sm text-[var(--text-secondary)] mb-6">Usamos este dato para registrar correctamente tu alta administrativa.</p>
                  @if (showErrors() && (!cd.taxIdType || !cd.taxIdValue)) {
                    <div class="bg-[var(--status-error-subtle)] border rounded-xl p-4 mb-6 flex items-start gap-3" style="border-color: rgba(220,38,38,0.2)">
                      <p class="text-sm font-bold text-[var(--status-error)]">Faltan campos obligatorios en este paso.</p>
                    </div>
                  }
                  <div class="space-y-5">
                    <div>
                      <label class="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1">Tipo de identificación *</label>
                      <select [(ngModel)]="cd.taxIdType" (ngModelChange)="onTaxIdTypeChange($event)"
                        class="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]">
                        <option value="">Seleccioná un tipo</option>
                        @for (t of taxIdTypes; track t.code) { <option [value]="t.code">{{ t.label }}</option> }
                      </select>
                    </div>
                    <div>
                      <label class="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1">Número de identificación *</label>
                      <input [(ngModel)]="cd.taxIdValue" (ngModelChange)="onTaxIdValueChange($event)"
                        [placeholder]="taxIdMask(cd.taxIdType)"
                        [attr.inputmode]="isArgentineTaxIdType(cd.taxIdType) ? 'numeric' : null"
                        [attr.maxlength]="isArgentineTaxIdType(cd.taxIdType) ? 13 : null"
                        class="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono"
                        [class.border-red-400]="!!taxIdError()">
                      @if (taxIdError()) { <p class="mt-1 text-xs text-[var(--status-error)]">{{ taxIdError() }}</p> }
                    </div>
                  </div>
                }
                @case (2) {
                  <h2 class="text-xl font-bold text-[var(--text-primary)] mb-1">Datos de cobro</h2>
                  <p class="text-sm text-[var(--text-secondary)] mb-6">Seleccioná cómo querés registrar tus datos de cobro para el alta.</p>
                  <div class="space-y-3">
                    @for (pm of paymentMethods; track pm.value) {
                      <button (click)="updateData({ paymentMethod: pm.value })" type="button"
                        class="w-full flex items-center justify-between p-4 rounded-xl border-2 text-left"
                        [class]="cd.paymentMethod === pm.value ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-subtle)]' : 'border-[var(--border-default)] hover:border-[var(--border-focus)] bg-[var(--bg-base)]'"
                      >
                        <div><p class="text-sm font-bold" [class]="cd.paymentMethod === pm.value ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'">{{ pm.label }}</p><p class="text-xs text-[var(--text-secondary)] mt-0.5">{{ pm.desc }}</p></div>
                        <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          [class]="cd.paymentMethod === pm.value ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]' : 'border-[var(--border-default)]'">
                          @if (cd.paymentMethod === pm.value) { <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> }
                        </div>
                      </button>
                    }
                  </div>
                  @if (cd.paymentMethod === 'CBU') {
                    <div class="mt-4">
                      <label class="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1">CBU *</label>
                      <input [(ngModel)]="cd.cbu" (ngModelChange)="onCbuChange($event)" placeholder="22 dígitos"
                        inputmode="numeric" maxlength="22"
                        class="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono"
                        [class.border-red-400]="!!cbuError()">
                      @if (cbuError()) { <p class="mt-1 text-xs text-[var(--status-error)]">{{ cbuError() }}</p> }
                    </div>
                  }
                  @if (cd.paymentMethod === 'CRYPTO') {
                    <div class="mt-4 space-y-3">
                      <div>
                        <label class="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1">Tipo de wallet</label>
                        <input [(ngModel)]="cd.walletType" (ngModelChange)="updateData({ walletType: $event })" placeholder="Ej.: Binance, MetaMask"
                          class="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]">
                      </div>
                      <div>
                        <label class="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1">Dirección de wallet</label>
                        <input [(ngModel)]="cd.walletAddress" (ngModelChange)="updateData({ walletAddress: $event })" placeholder="0x..."
                          class="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono">
                      </div>
                    </div>
                  }
                }
                @case (3) {
                  <h2 class="text-xl font-bold text-[var(--text-primary)] mb-1">Referencias</h2>
                  <p class="text-sm text-[var(--text-secondary)] mb-6">Agregá al menos una referencia laboral o profesional.</p>
                  @for (ref of cd.references; track ref.id; let i = $index) {
                    <div class="bg-[var(--bg-subtle)] rounded-lg p-4 mb-3 border border-[var(--border-subtle)]">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-bold text-[var(--text-tertiary)]">Referencia {{ i + 1 }}</span>
                        <button (click)="removeReference(i)" class="text-xs text-[var(--status-error)] hover:underline">Eliminar</button>
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input [(ngModel)]="ref.fullName" placeholder="Nombre completo" class="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]">
                        <input [(ngModel)]="ref.relationship" placeholder="Relación" class="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]">
                        <input [(ngModel)]="ref.company" placeholder="Empresa" class="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]">
                        <input [(ngModel)]="ref.email" type="email" placeholder="Correo" class="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                          [class.border-red-400]="!!ref.email && !isValidEmail(ref.email)">
                        @if (ref.email && !isValidEmail(ref.email)) { <p class="text-xs text-[var(--status-error)] sm:col-span-2">Ingresá un correo válido.</p> }
                        <input [(ngModel)]="ref.phone" placeholder="Teléfono" class="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]">
                      </div>
                    </div>
                  }
                  <button (click)="addReference()" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--brand-primary)] bg-[var(--brand-primary-subtle)] hover:opacity-80">
                    + Agregar referencia
                  </button>
                }
                @case (4) {
                  <h2 class="text-xl font-bold text-[var(--text-primary)] mb-1">Archivos</h2>
                  <p class="text-sm text-[var(--text-secondary)] mb-6">Subí los documentos requeridos para tu alta (mock - no se suben realmente).</p>
                  <div class="border-2 border-dashed border-[var(--border-default)] rounded-xl p-8 text-center">
                    <p class="text-sm text-[var(--text-tertiary)]">Arrastrá archivos aquí o hacé clic para seleccionar</p>
                    <p class="text-[10px] text-[var(--text-tertiary)] mt-1">(Simulación - los archivos no se almacenan)</p>
                    <button (click)="mockFileUpload()" class="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">
                      Simular carga de archivo
                    </button>
                  </div>
                  @if (cd.files.length > 0) {
                    <div class="mt-4 space-y-2">
                      @for (f of cd.files; track f.id) {
                        <div class="flex items-center justify-between bg-[var(--bg-subtle)] rounded-lg p-3 border border-[var(--border-subtle)]">
                          <span class="text-sm text-[var(--text-primary)]">{{ f.name }}</span>
                          <span class="text-[10px] text-[var(--text-tertiary)]">{{ (f.sizeBytes / 1024).toFixed(1) }} KB</span>
                        </div>
                      }
                    </div>
                  }
                }
              }
            </div>

            <!-- Navigation -->
            <div class="flex items-center justify-between gap-3">
              @if (cd.currentStep > 1) {
                <button (click)="prevStep()" class="px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]">
                  Anterior
                </button>
              } @else { <div></div> }

              @if (cd.currentStep < 4) {
                <button (click)="nextStep()" [disabled]="!canAdvanceStep()" class="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60">
                  Siguiente
                </button>
              } @else {
                <button (click)="submitForm()" [disabled]="!canSubmitForm()" class="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60">
                  Enviar datos
                </button>
              }
            </div>
          </div>
        }
      }
      }
    }
  `,
})
export class CandidateWizardComponent {
  readonly svc = inject(OnboardingMockService);
  readonly steps = STEPS;
  readonly taxIdTypes = TAX_ID_TYPES;
  readonly showErrors = signal(false);

  readonly paymentMethods = [
    { value: 'CBU' as const, label: 'Transferencia bancaria (CBU)', desc: 'Cuenta bancaria argentina' },
    { value: 'WIRE' as const, label: 'Transferencia internacional', desc: 'Cuenta bancaria del exterior' },
    { value: 'CRYPTO' as const, label: 'Cripto', desc: 'Billetera de criptomonedas' },
  ];

  taxIdMask(type: string): string {
    return TAX_ID_TYPES.find(t => t.code === type)?.mask || 'Ingresá el número';
  }

  isArgentineTaxIdType(type: string): boolean {
    return type === 'CUIT' || type === 'CUIL';
  }

  isValidEmail(value: string): boolean {
    return isValidEmailFn(value);
  }

  private currentData(): CandidateData | null {
    return this.svc.selectedCase()?.candidateData ?? null;
  }

  taxIdError(): string | null {
    const cd = this.currentData();
    if (!cd) return null;
    if (!cd.taxIdType || !cd.taxIdValue.trim()) return 'Completá la identificación fiscal.';

    if (this.isArgentineTaxIdType(cd.taxIdType)) {
      const validation = validateCuit(cd.taxIdValue);
      return validation.valid ? null : validation.error ?? 'El CUIT no es válido.';
    }

    return null;
  }

  cbuError(): string | null {
    const cd = this.currentData();
    if (!cd || cd.paymentMethod !== 'CBU') return null;
    if (!cd.cbu.trim()) return 'Completá el CBU.';

    const validation = validateCbu(cd.cbu);
    return validation.valid ? null : validation.error ?? 'El CBU no es válido.';
  }

  referencesError(): string | null {
    const cd = this.currentData();
    if (!cd) return null;
    const invalidReference = cd.references.find(ref => !!ref.email.trim() && !this.isValidEmail(ref.email));
    return invalidReference ? 'Revisá los correos de las referencias.' : null;
  }

  onTaxIdTypeChange(type: string): void {
    const cd = this.currentData();
    if (!cd) return;

    const nextValue = this.isArgentineTaxIdType(type) ? formatCuit(cd.taxIdValue) : cd.taxIdValue;
    this.updateData({ taxIdType: type, taxIdValue: nextValue });
  }

  onTaxIdValueChange(value: string): void {
    const cd = this.currentData();
    if (!cd) return;

    const nextValue = this.isArgentineTaxIdType(cd.taxIdType) ? formatCuit(value) : value;
    this.updateData({ taxIdValue: nextValue });
  }

  onCbuChange(value: string): void {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 22);
    this.updateData({ cbu: cleaned });
  }

  canAdvanceStep(): boolean {
    const cd = this.currentData();
    if (!cd) return false;

    if (cd.currentStep === 1) return !this.taxIdError();
    if (cd.currentStep === 2) return !!cd.paymentMethod && !this.cbuError();
    if (cd.currentStep === 3) return !this.referencesError();

    return true;
  }

  canSubmitForm(): boolean {
    const cd = this.currentData();
    if (!cd) return false;

    return !this.taxIdError() && !!cd.paymentMethod && !this.cbuError() && !this.referencesError();
  }

  updateData(data: Partial<CandidateData>): void {
    const c = this.svc.selectedCase();
    if (c) this.svc.updateCandidateData(c.id, data);
  }

  nextStep(): void {
    const c = this.svc.selectedCase();
    if (!c?.candidateData) return;
    const cd = c.candidateData;

    if (!this.canAdvanceStep()) {
      this.showErrors.set(true);
      return;
    }

    if (cd.currentStep === 2 && !cd.paymentMethod) {
      this.svc.addToast('warning', 'Seleccioná un método de cobro');
      return;
    }

    this.showErrors.set(false);
    const completed = cd.completedSteps.includes(cd.currentStep) ? cd.completedSteps : [...cd.completedSteps, cd.currentStep];
    this.svc.updateCandidateData(c.id, { currentStep: cd.currentStep + 1, completedSteps: completed });
  }

  prevStep(): void {
    const c = this.svc.selectedCase();
    if (!c?.candidateData || c.candidateData.currentStep <= 1) return;
    this.svc.updateCandidateData(c.id, { currentStep: c.candidateData.currentStep - 1 });
    this.showErrors.set(false);
  }

  addReference(): void {
    const c = this.svc.selectedCase();
    if (!c?.candidateData) return;
    const newRef: Reference = { id: Date.now().toString(), fullName: '', relationship: '', company: '', email: '', phone: '' };
    this.svc.updateCandidateData(c.id, { references: [...c.candidateData.references, newRef] });
  }

  removeReference(index: number): void {
    const c = this.svc.selectedCase();
    if (!c?.candidateData) return;
    const refs = [...c.candidateData.references];
    refs.splice(index, 1);
    this.svc.updateCandidateData(c.id, { references: refs });
  }

  mockFileUpload(): void {
    const c = this.svc.selectedCase();
    if (!c?.candidateData) return;
    const newFile = { id: Date.now().toString(), fileType: 'w8' as const, name: `documento_${c.candidateData.files.length + 1}.pdf`, sizeBytes: Math.round(Math.random() * 500000) };
    this.svc.updateCandidateData(c.id, { files: [...c.candidateData.files, newFile] });
  }

  submitForm(): void {
    const c = this.svc.selectedCase();
    if (!c?.candidateData) return;
    if (!this.canSubmitForm()) {
      this.showErrors.set(true);
      return;
    }
    const completed = c.candidateData.completedSteps.includes(4) ? c.candidateData.completedSteps : [...c.candidateData.completedSteps, 4];
    this.svc.updateCandidateData(c.id, { completedSteps: completed });
    this.svc.submitCandidateForm(c.id);
  }
}
