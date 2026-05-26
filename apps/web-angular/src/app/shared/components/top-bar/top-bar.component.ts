import { Component } from '@angular/core';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  template: `
    <header class="h-[42px] flex-shrink-0 flex items-center justify-between px-4 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-[var(--text-tertiary)]">Onboarding</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-[var(--text-tertiary)] font-mono">v1</span>
      </div>
    </header>
  `,
})
export class TopBarComponent {}
