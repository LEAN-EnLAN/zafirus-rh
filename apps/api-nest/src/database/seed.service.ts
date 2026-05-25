import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../employees/employee.entity';
import { OnboardingCase } from '../cases/onboarding-case.entity';
import { CandidateSubmission } from '../candidate-submissions/candidate-submission.entity';
import { EmailTemplate } from '../email-templates/email-template.entity';
import { OnboardingTask } from '../tasks/onboarding-task.entity';
import { AuditEvent } from '../audit/audit-event.entity';
import { CaseStatus, TaskStatus, TaskType, ActorType } from '../common/enums';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(OnboardingCase)
    private readonly caseRepo: Repository<OnboardingCase>,
    @InjectRepository(CandidateSubmission)
    private readonly subRepo: Repository<CandidateSubmission>,
    @InjectRepository(EmailTemplate)
    private readonly emailRepo: Repository<EmailTemplate>,
    @InjectRepository(OnboardingTask)
    private readonly taskRepo: Repository<OnboardingTask>,
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
  ) {}

  async run(full = false): Promise<{ message: string }> {
    this.logger.log(`Seeding demo data (${full ? 'full' : 'quick'})...`);
    if (!full) return this.seedQuick();
    return this.seedFull();
  }

  private async seedQuick(): Promise<{ message: string }> {
    // ── Employee 1: María Pérez — draft case
    const emp1 = await this.employeeRepo.save(
      this.employeeRepo.create({
        firstName: 'María',
        lastName: 'Pérez',
        personalEmail: 'maria.perez@gmail.com',
        role: 'Product Manager',
        area: 'product',
        location: 'CABA, Argentina',
        startDate: this.futureDate(14),
        managerName: 'Carlos Ruiz',
      }),
    );
    const case1 = await this.caseRepo.save(
      this.caseRepo.create({
        employeeId: emp1.id,
        status: CaseStatus.DRAFT,
        candidateToken: this.token(),
      }),
    );
    await this.audit(case1.id, 'case_created', 'rrhh');

    // ── Employee 2: Lucas Gómez — candidate_submitted
    const emp2 = await this.employeeRepo.save(
      this.employeeRepo.create({
        firstName: 'Lucas',
        lastName: 'Gómez',
        personalEmail: 'lucas.gomez@hotmail.com',
        role: 'UX Designer',
        area: 'design',
        location: 'Santiago, Chile',
        startDate: this.futureDate(7),
        managerName: 'Ana Silva',
      }),
    );
    const case2 = await this.caseRepo.save(
      this.caseRepo.create({
        employeeId: emp2.id,
        status: CaseStatus.CANDIDATE_SUBMITTED,
        candidateToken: this.token(),
        candidateSubmittedAt: new Date(),
      }),
    );
    await this.audit(case2.id, 'case_created', 'rrhh');

    // ── Employee 3: Juan López — ready_to_activate with tasks
    const emp3 = await this.employeeRepo.save(
      this.employeeRepo.create({
        firstName: 'Juan',
        lastName: 'López',
        personalEmail: 'juan.lopez@gmail.com',
        corporateEmail: 'jlopez@zafirus.tech',
        role: 'Backend Engineer',
        area: 'engineering',
        location: 'Rosario, Argentina',
        startDate: this.futureDate(3),
        managerName: 'Ágata Fidani',
        documentId: '34567890',
        taxIdValue: '20-34567890-1',
        bankAccount: '0070234565000000123456',
      }),
    );
    const case3 = await this.caseRepo.save(
      this.caseRepo.create({
        employeeId: emp3.id,
        status: CaseStatus.READY_TO_ACTIVATE,
        candidateToken: this.token(),
        candidateSubmittedAt: new Date(Date.now() - 86400000),
        dataConsolidatedAt: new Date(Date.now() - 3600000),
        approvedAt: new Date(),
      }),
    );
    await this.audit(case3.id, 'case_created', 'rrhh');

    this.logger.log('Seed complete: 3 employees, 3 cases created');
    return { message: 'Seed complete: 3 employees, 3 cases' };
  }

  private async seedFull(): Promise<{ message: string }> {
    const groupSuggestions = {
      ar: ['all-argentina@zafirus.tech', 'people-ops@zafirus.tech'],
      cl: ['all-chile@zafirus.tech', 'design@zafirus.tech'],
      uy: ['all-uruguay@zafirus.tech', 'frontend@zafirus.tech'],
      pe: ['all-peru@zafirus.tech', 'ops@zafirus.tech'],
      mx: ['all-mexico@zafirus.tech', 'backend@zafirus.tech'],
    };

    const sofia = await this.createCase({
      firstName: 'Sofía', lastName: 'López', personalEmail: 'sofia.lopez@gmail.com', role: 'Product Manager', area: 'product', location: 'CABA, Argentina', managerName: 'Mariano Costa', documentId: '30111222', taxIdValue: '27-30111222-8', bankAccount: '2850590940090418135201', status: CaseStatus.DRAFT, startDateOffset: 20,
      auditActions: ['case_created', 'employee_profile_completed', 'email_template_drafted', 'groups_suggested'],
      email: { approved: false, subject: '¡Bienvenida Sofía a Zafirus!', variables: { country: 'AR', groupSuggestions: groupSuggestions.ar, templateState: 'draft' } },
    });

    const lucas = await this.createCase({
      firstName: 'Lucas', lastName: 'Gómez', personalEmail: 'lucas.gomez@gmail.com', role: 'Diseño UX', area: 'design', location: 'Santiago, Chile', managerName: 'Ana Silva', documentId: '18900321', taxIdValue: '18.900.321-7', bankAccount: '0010987654321', status: CaseStatus.CANDIDATE_INVITED, startDateOffset: 15,
      auditActions: ['case_created', 'candidate_form_sent', 'candidate_reminder_sent', 'groups_suggested'],
      email: { approved: true, subject: 'Lucas, completa tu onboarding en Zafirus', variables: { country: 'CL', groupSuggestions: groupSuggestions.cl, templateState: 'scheduled' }, approvedAtOffsetHours: -6 },
      token: true,
    });

    const valentina = await this.createCase({
      firstName: 'Valentina', lastName: 'Martínez', personalEmail: 'valentina.martinez@gmail.com', role: 'Frontend Developer', area: 'engineering', location: 'Montevideo, Uruguay', managerName: 'Romina Bela', documentId: '48722113', taxIdValue: '48722113', bankAccount: 'BROU-001-88991234', status: CaseStatus.CANDIDATE_SUBMITTED, startDateOffset: 10,
      auditActions: ['case_created', 'candidate_form_sent', 'candidate_form_submitted', 'candidate_documents_uploaded', 'candidate_data_pending_consolidation'],
      email: { approved: true, subject: 'Valentina, te damos la bienvenida a Zafirus', variables: { country: 'UY', groupSuggestions: groupSuggestions.uy, templateState: 'sent' }, approvedAtOffsetHours: -20 },
      token: true,
      candidateSubmittedAtOffsetHours: -18,
      submission: {
        taxIdType: 'CI',
        paymentMethod: 'WIRE',
        bankAccount: null,
        walletAddress: null,
        internationalBankData: { bankName: 'Banco Itaú Uruguay', swift: 'BITUUYMM', accountHolder: 'Valentina Martínez', accountNumber: 'UY6600100000000001234567' },
        references: [
          { fullName: 'Ignacio Pereda', relationship: 'Líder técnico', company: 'PixelSoft', email: 'ignacio.pereda@pixelsoft.com', phone: '+598 98 222 451' },
          { fullName: 'María Noel Duarte', relationship: 'PM', company: 'TuProducto', email: 'maria.duarte@tuproducto.io', phone: '+598 99 918 100' },
        ],
        documents: [
          { type: 'id_front', name: 'ci_frente_valentina.jpg', sizeKb: 440 },
          { type: 'id_back', name: 'ci_dorso_valentina.jpg', sizeKb: 418 },
          { type: 'tax_certificate', name: 'cert_dgi_valentina.pdf', sizeKb: 292 },
        ],
      },
    });

    await this.createCase({
      firstName: 'Diego', lastName: 'Navarro', personalEmail: 'diego.navarro@gmail.com', role: 'Analista RRHH', area: 'people', location: 'Córdoba, Argentina', managerName: 'Paula Méndez', documentId: '33221100', taxIdValue: '20-33221100-4', bankAccount: '0720123499000000881010', status: CaseStatus.HR_REVIEW, startDateOffset: 8,
      auditActions: ['case_created', 'candidate_form_sent', 'candidate_form_submitted', 'review_started', 'candidate_data_consolidated', 'review_comment_added'],
      email: { approved: true, subject: 'Diego, próximos pasos de tu ingreso', variables: { country: 'AR', groupSuggestions: groupSuggestions.ar, templateState: 'scheduled' }, approvedAtOffsetHours: -16 },
      token: true,
      candidateSubmittedAtOffsetHours: -30,
      dataConsolidatedAtOffsetHours: -8,
      submission: {
        taxIdType: 'CUIT', paymentMethod: 'CBU', bankAccount: '0720123499000000881010', walletAddress: null,
        references: [{ fullName: 'Elena Gutiérrez', relationship: 'Gerente HR', company: 'Talento Hoy', email: 'elena.gutierrez@talentohoy.com', phone: '+54 351 444-1990' }],
        documents: [{ type: 'constancia_cuit', name: 'cuit_diego.pdf' }],
      },
    });

    await this.createCase({
      firstName: 'Camila', lastName: 'Torres', personalEmail: 'camila.torres@gmail.com', role: 'Operations Lead', area: 'operations', location: 'Lima, Perú', managerName: 'Fernando Rocha', documentId: '45781902', taxIdValue: '10457819021', bankAccount: '00219400045566778899', status: CaseStatus.READY_TO_ACTIVATE, startDateOffset: 6,
      auditActions: ['case_created', 'candidate_form_sent', 'candidate_form_submitted', 'review_started', 'candidate_data_consolidated', 'case_approved', 'activation_queued'],
      email: { approved: true, subject: 'Camila, bienvenida al equipo Zafirus', variables: { country: 'PE', groupSuggestions: groupSuggestions.pe, templateState: 'draft' }, approvedAtOffsetHours: -12 },
      token: true,
      candidateSubmittedAtOffsetHours: -40,
      dataConsolidatedAtOffsetHours: -24,
      approvedAtOffsetHours: -10,
      submission: {
        taxIdType: 'RUC', paymentMethod: 'WIRE', bankAccount: '00219400045566778899', walletAddress: null,
        internationalBankData: { bankName: 'BCP', swift: 'BCPLPEPL', accountHolder: 'Camila Torres', accountNumber: '193-00219400045566778899-11' },
        references: [{ fullName: 'Juan Carlos Casas', relationship: 'Director de Operaciones', company: 'Andes Logistics', email: 'jccasas@andeslogistics.pe', phone: '+51 987 000 215' }],
        documents: [{ type: 'ruc', name: 'ruc_camila.pdf' }],
      },
    });

    const juan = await this.createCase({
      firstName: 'Juan', lastName: 'Herrera', personalEmail: 'juan.herrera@gmail.com', role: 'Backend Engineer', area: 'engineering', location: 'CDMX, México', managerName: 'Ágata Fidani', documentId: 'MEX-HERJ8801', taxIdValue: 'HEHJ880115QQ1', bankAccount: '646180157400012345', status: CaseStatus.ACTIVATING, startDateOffset: 2,
      auditActions: ['case_created', 'candidate_form_sent', 'candidate_form_submitted', 'review_started', 'candidate_data_consolidated', 'case_approved', 'activation_started'],
      email: { approved: true, subject: 'Juan, activación de tu cuenta corporativa', variables: { country: 'MX', groupSuggestions: groupSuggestions.mx, templateState: 'sent' }, approvedAtOffsetHours: -36 },
      token: true,
      candidateSubmittedAtOffsetHours: -72,
      dataConsolidatedAtOffsetHours: -60,
      approvedAtOffsetHours: -48,
      activatedAtOffsetHours: -6,
      submission: {
        taxIdType: 'RFC', paymentMethod: 'CBU', bankAccount: '646180157400012345', walletAddress: null,
        references: [{ fullName: 'Gabriela Pineda', relationship: 'Engineering Manager', company: 'Norte Tech', email: 'gabriela.pineda@nortetech.mx', phone: '+52 55 8888 1020' }],
        documents: [{ type: 'rfc_constancia', name: 'constancia_rfc_juan.pdf' }],
      },
    });

    await this.createTasks(juan.caseId, [TaskStatus.SUCCESS, TaskStatus.SUCCESS, TaskStatus.PENDING, TaskStatus.PENDING, TaskStatus.PENDING, TaskStatus.PENDING, TaskStatus.PENDING, TaskStatus.PENDING]);

    const lucia = await this.createCase({
      firstName: 'Lucía', lastName: 'Ramírez', personalEmail: 'lucia.ramirez@gmail.com', role: 'Finance Analyst', area: 'finance', location: 'Mendoza, Argentina', managerName: 'Julieta Banegas', documentId: '27889911', taxIdValue: '27-27889911-9', bankAccount: '1910044455000066778899', status: CaseStatus.OPERATIVE, startDateOffset: -5,
      auditActions: ['case_created', 'candidate_form_sent', 'candidate_form_submitted', 'review_started', 'candidate_data_consolidated', 'case_approved', 'activation_completed', 'fully_operative'],
      email: { approved: true, subject: 'Lucía, ya estás operativa en Zafirus', variables: { country: 'AR', groupSuggestions: groupSuggestions.ar, templateState: 'sent' }, approvedAtOffsetHours: -110 },
      token: true,
      candidateSubmittedAtOffsetHours: -140,
      dataConsolidatedAtOffsetHours: -130,
      approvedAtOffsetHours: -120,
      activatedAtOffsetHours: -115,
      submission: {
        taxIdType: 'CUIT', paymentMethod: 'CBU', bankAccount: '1910044455000066778899', walletAddress: null,
        references: [{ fullName: 'Raúl Acosta', relationship: 'Finance Lead', company: 'LibroMayor SA', email: 'r.acosta@libromayor.com', phone: '+54 261 555-9022' }],
        documents: [{ type: 'cbu', name: 'cert_cbu_lucia.pdf' }],
      },
    });
    await this.createTasks(lucia.caseId, [TaskStatus.SUCCESS, TaskStatus.SUCCESS, TaskStatus.SUCCESS, TaskStatus.SUCCESS, TaskStatus.SUCCESS, TaskStatus.SUCCESS, TaskStatus.SUCCESS, TaskStatus.SUCCESS]);

    this.logger.log(`Seed complete: 7 employees, 7 cases created (${sofia.caseId}, ${lucas.caseId}, ${valentina.caseId})`);
    return { message: 'Seed complete: 7 employees, 7 cases' };
  }

  private async createCase(input: any): Promise<{ caseId: string }> {
    const emp = await this.employeeRepo.save(this.employeeRepo.create({
      firstName: input.firstName,
      lastName: input.lastName,
      personalEmail: input.personalEmail,
      corporateEmail: this.generateCorporateEmail(input.firstName, input.lastName),
      role: input.role,
      area: input.area,
      location: input.location,
      startDate: this.futureDate(input.startDateOffset),
      managerName: input.managerName,
      documentId: input.documentId,
      taxIdValue: input.taxIdValue,
      bankAccount: input.bankAccount,
    }));

    const c = await this.caseRepo.save(this.caseRepo.create({
      employeeId: emp.id,
      status: input.status,
      candidateToken: input.token ? this.token() : null,
      candidateSubmittedAt: this.offsetDate(input.candidateSubmittedAtOffsetHours),
      dataConsolidatedAt: this.offsetDate(input.dataConsolidatedAtOffsetHours),
      approvedAt: this.offsetDate(input.approvedAtOffsetHours),
      activatedAt: this.offsetDate(input.activatedAtOffsetHours),
    }));

    for (const action of input.auditActions ?? []) {
      await this.audit(c.id, action, action.includes('candidate') ? 'candidate' : 'rrhh', action.includes('candidate') ? ActorType.USER : ActorType.USER);
    }

    await this.emailRepo.save(this.emailRepo.create({
      caseId: c.id,
      subject: input.email.subject,
      bodyHtml: `<p>${input.email.subject}</p><p>Hola ${input.firstName}, este es tu correo de onboarding.</p>`,
      variables: input.email.variables,
      approved: input.email.approved,
      approvedAt: this.offsetDate(input.email.approvedAtOffsetHours),
      changedAfterApproval: false,
    }));

    if (input.submission) {
      await this.subRepo.save(this.subRepo.create({
        caseId: c.id,
        taxIdType: input.submission.taxIdType,
        taxIdValue: input.taxIdValue,
        paymentMethod: input.submission.paymentMethod,
        bankAccount: input.submission.bankAccount,
        walletAddress: input.submission.walletAddress,
        internationalBankData: input.submission.internationalBankData ?? null,
        references: input.submission.references,
        documents: input.submission.documents,
        rawPayload: {
          profileComplete: true,
          emergencyContact: { name: 'Contacto Familiar', phone: '+54 11 4000-1000' },
        },
        submittedAt: this.offsetDate(input.candidateSubmittedAtOffsetHours) ?? new Date(),
      }));
    }

    return { caseId: c.id };
  }

  private async createTasks(caseId: string, statuses: TaskStatus[]): Promise<void> {
    const taskTypes: { type: TaskType; label: string }[] = [
      { type: TaskType.CREATE_GOOGLE_USER, label: 'Crear usuario de Google Workspace' },
      { type: TaskType.ADD_GOOGLE_GROUPS, label: 'Agregar a grupos sugeridos' },
      { type: TaskType.CONFIGURE_GMAIL_SIGNATURE, label: 'Configurar firma Gmail' },
      { type: TaskType.SEND_WELCOME_EMAIL, label: 'Enviar welcome email' },
      { type: TaskType.ANNOUNCE_IN_GROUPS, label: 'Anunciar en grupos' },
      { type: TaskType.POST_INTERNAL_ANNOUNCEMENT, label: 'Publicar anuncio interno' },
      { type: TaskType.REQUEST_DEVICE, label: 'Solicitar equipo' },
      { type: TaskType.NOTIFY_ADMINISTRATION, label: 'Notificar administración' },
    ];

    for (let i = 0; i < taskTypes.length; i++) {
      const s = statuses[i] ?? TaskStatus.PENDING;
      await this.taskRepo.save(this.taskRepo.create({
        caseId,
        type: taskTypes[i].type,
        label: taskTypes[i].label,
        status: s,
        attempts: s === TaskStatus.PENDING ? 0 : 1,
        startedAt: s === TaskStatus.PENDING ? null : new Date(Date.now() - (i + 2) * 3600000),
        completedAt: s === TaskStatus.SUCCESS ? new Date(Date.now() - (i + 1) * 3000000) : null,
      }));
    }
  }

  private async audit(
    caseId: string,
    action: string,
    actorName: string,
    actorType = ActorType.USER,
  ): Promise<void> {
    await this.auditRepo.save(
      this.auditRepo.create({
        caseId,
        action,
        actorType,
        actorName,
        category: 'case',
      }),
    );
  }

  private futureDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  private offsetDate(hours?: number): Date | null {
    if (hours === undefined) return null;
    return new Date(Date.now() + hours * 3600000);
  }

  private generateCorporateEmail(first: string, last: string): string {
    const removeAccents = (str: string) =>
      str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const initial = removeAccents(first.charAt(0).toLowerCase());
    const surname = removeAccents(last.split(' ')[0].toLowerCase().replace(/[^a-z]/g, ''));
    return `${initial}${surname}@zafirus.tech`;
  }

  private token(): string {
    const chars = 'abcdef0123456789';
    let t = '';
    for (let i = 0; i < 32; i++) t += chars[Math.floor(Math.random() * chars.length)];
    return t;
  }
}
