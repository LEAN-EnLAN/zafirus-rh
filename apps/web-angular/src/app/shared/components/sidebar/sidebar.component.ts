import { Component, computed, inject, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { OnboardingMockService } from '../../../onboarding/services/onboarding-mock.service';
import { ZafirusLogoComponent } from '../zafirus-logo/zafirus-logo.component';

interface SidebarNavItem {
  label: string;
  link: string;
  exact?: boolean;
  hint: string;
  icon: 'home' | 'demo';
}

interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ZafirusLogoComponent],
  template: `
    <aside
      [class]="svc.sidebarOpen()
        ? 'flex h-full w-[292px] flex-shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[var(--shell-bg)] px-5 py-5 text-[var(--shell-text)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)] opacity-100 transition-all duration-300 ease-out'
        : 'flex h-full w-0 flex-shrink-0 flex-col overflow-hidden border-0 bg-[var(--shell-bg)] px-0 py-5 text-[var(--shell-text)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)] opacity-0 pointer-events-none transition-all duration-300 ease-out'"
    >
      <a routerLink="/" class="flex min-h-[56px] items-center gap-3 rounded-[24px] px-2 py-1.5 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
        <div class="flex h-12 w-12 items-center justify-center rounded-[20px] bg-white/10 ring-1 ring-white/10">
          <app-zafirus-logo [size]="34" />
        </div>
        <div class="min-w-0">
          <p class="truncate text-[22px] font-semibold tracking-[-0.04em] text-white">Zafirus</p>
          <p class="truncate text-xs font-medium uppercase tracking-[0.22em] text-[var(--shell-muted)]">Espacio de RRHH</p>
        </div>
      </a>

      <input
        type="search"
        placeholder="Buscar..."
        aria-label="Buscar casos"
        [value]="searchTerm()"
        (input)="onSearchInput($event)"
        class="mt-4 w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 text-sm px-3 py-2 focus:outline-none focus:border-white/20"
      />

      <div class="mt-6 space-y-4 overflow-y-auto pr-1">
        @for (section of sections(); track section.title) {
          <section class="rounded-[24px] border border-white/8 bg-white/5 p-2">
            <div class="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
              {{ section.title }}
            </div>
            <nav class="space-y-1">
              @for (item of section.items; track item.label) {
                  <a
                    [routerLink]="item.link"
                    routerLinkActive="bg-[var(--shell-active)] text-white ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                    class="group flex min-h-[44px] items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium text-[var(--shell-text)] transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/5 text-current transition-colors group-hover:bg-white/10">
                    @switch (item.icon) {
                      @case ('home') {
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M3 11.5 12 4l9 7.5M5 10.5V20h14v-9.5" />
                        </svg>
                      }
                      @case ('demo') {
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h10M7 11h10M7 15h6M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
                        </svg>
                      }
                    }
                  </span>
                  <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                  <span class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">{{ item.hint }}</span>
                </a>
              }
            </nav>
          </section>
        }
      </div>

    </aside>
  `,
})
export class SidebarComponent {
  readonly svc = inject(OnboardingMockService);
  readonly searchTerm = signal('');
  readonly searchChange = output<string>();

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.searchChange.emit(value);
  }

  readonly sections = computed<SidebarSection[]>(() => [
    {
      title: 'Espacio de trabajo',
      items: [
        { label: 'Inicio', link: '/', exact: true, hint: 'Principal', icon: 'home' },
        ...(this.svc.isDemo()
          ? [{ label: 'Demo', link: '/demo', exact: true, hint: 'Alta', icon: 'demo' as const }]
          : []),
      ],
    },
  ]);
}
