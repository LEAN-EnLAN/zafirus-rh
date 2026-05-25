import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { TopBarComponent } from './shared/components/top-bar/top-bar.component';
import { ToastContainerComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SidebarComponent, TopBarComponent, ToastContainerComponent, RouterOutlet],
  styles: [`
    :host {
      display: block;
      height: 100dvh;
      overflow: hidden;
      background: var(--bg-base);
    }
  `],
  template: `
    <div class="flex h-full min-h-0 overflow-hidden bg-[var(--bg-base)]">
      <app-sidebar />
      <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <app-top-bar />
        <main class="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[var(--bg-base)]">
          <section class="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[var(--bg-base)]">
            <router-outlet />
          </section>
        </main>
      </div>
      <app-toast-container />
    </div>
  `,
})
export class AppComponent {}
