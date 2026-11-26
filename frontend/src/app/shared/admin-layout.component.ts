import { Component, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { PinModalComponent } from './pin-modal.component';

interface SeccionProtegida {
  ruta: string;
  nombre: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PinModalComponent],
  template: `
    <div class="d-flex min-vh-100 bg-white">
      <!-- Sidebar Desktop -->
      <aside class="admin-sidebar d-none d-md-flex flex-column justify-content-between border-end p-3">
        <div>
          <div class="d-flex align-items-center gap-2 mb-4 px-2 pt-1">
            <span class="vf-logo-box">VF</span>
            <span class="fw-bold fs-6">Venta Fácil</span>
          </div>

          <nav class="nav flex-column gap-1">
            <a
              class="nav-link vf-nav-item"
              routerLink="/admin/inicio"
              routerLinkActive="active"
            >
              Inicio
            </a>
            <a
              class="nav-link vf-nav-item"
              routerLink="/admin/vender"
              routerLinkActive="active"
            >
              Nueva venta
            </a>
            <a
              class="nav-link vf-nav-item"
              routerLink="/admin/mis-ventas"
              routerLinkActive="active"
            >
              Mis ventas
            </a>
            <button
              type="button"
              class="nav-link vf-nav-item d-flex align-items-center justify-content-between text-start border-0 bg-transparent w-100"
              [class.active]="rutaActual() === '/admin/anulaciones'"
              (click)="irASeccionProtegida('/admin/anulaciones', 'Revisión de anulaciones')"
            >
              <span>Revisión de<br />anulaciones</span>
              <span class="d-inline-flex align-items-center gap-1">
                <i class="bi bi-lock small text-muted"></i>
                @if (porAnularCount() > 0) {
                  <span class="badge rounded-pill bg-vf-badge">{{ porAnularCount() }}</span>
                }
              </span>
            </button>
            <a
              class="nav-link vf-nav-item"
              routerLink="/admin/resumen"
              routerLinkActive="active"
            >
              Resumen
            </a>
            <a
              class="nav-link vf-nav-item"
              routerLink="/admin/historial"
              routerLinkActive="active"
            >
              Historial
            </a>
            <button
              type="button"
              class="nav-link vf-nav-item d-flex align-items-center justify-content-between text-start border-0 bg-transparent w-100"
              [class.active]="rutaActual() === '/admin/menu'"
              (click)="irASeccionProtegida('/admin/menu', 'Menú')"
            >
              <span>Menú</span>
              <i class="bi bi-lock small text-muted"></i>
            </button>
            <button
              type="button"
              class="nav-link vf-nav-item d-flex align-items-center justify-content-between text-start border-0 bg-transparent w-100"
              [class.active]="rutaActual() === '/admin/equipo'"
              (click)="irASeccionProtegida('/admin/equipo', 'Equipo')"
            >
              <span>Equipo</span>
              <i class="bi bi-lock small text-muted"></i>
            </button>
          </nav>
        </div>

        <div class="border-top pt-3 px-2">
          <div class="fw-semibold small">{{ auth.usuario()?.nombre }}</div>
          <div class="text-muted small mb-2">Administradora</div>
          <button
            type="button"
            class="btn btn-link text-vf-primary text-decoration-none p-0 small fw-medium"
            (click)="auth.logout()"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex-grow-1 d-flex flex-column min-w-0">
        <!-- Mobile top bar -->
        <header class="d-md-none d-flex align-items-center justify-content-between border-bottom px-3 py-2 bg-white sticky-top">
          <div class="d-flex align-items-center gap-2">
            <span class="vf-logo-box" style="width:34px;height:34px;font-size:0.7rem;">VF</span>
            <span class="fw-bold">Venta Fácil</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <a routerLink="/admin/inicio" class="btn btn-sm btn-vf-outline">Inicio</a>
            <a routerLink="/admin/vender" class="btn btn-sm btn-vf-primary">Vender</a>
            <button type="button" class="btn btn-sm btn-vf-outline" (click)="menuMovilAbierto.set(!menuMovilAbierto())">
              <i class="bi bi-list"></i>
            </button>
          </div>
        </header>

        @if (menuMovilAbierto()) {
          <div class="d-md-none border-bottom bg-light p-3">
            <div class="d-flex flex-wrap gap-2">
              <a routerLink="/admin/mis-ventas" (click)="menuMovilAbierto.set(false)" class="btn btn-sm btn-vf-outline">Mis ventas</a>
              <button (click)="menuMovilAbierto.set(false); irASeccionProtegida('/admin/anulaciones', 'Revisión de anulaciones')" class="btn btn-sm btn-vf-outline">
                Anulaciones ({{ porAnularCount() }})
              </button>
              <a routerLink="/admin/resumen" (click)="menuMovilAbierto.set(false)" class="btn btn-sm btn-vf-outline">Resumen</a>
              <a routerLink="/admin/historial" (click)="menuMovilAbierto.set(false)" class="btn btn-sm btn-vf-outline">Historial</a>
              <button (click)="menuMovilAbierto.set(false); irASeccionProtegida('/admin/menu', 'Menú')" class="btn btn-sm btn-vf-outline">Menú</button>
              <button (click)="menuMovilAbierto.set(false); irASeccionProtegida('/admin/equipo', 'Equipo')" class="btn btn-sm btn-vf-outline">Equipo</button>
              <button (click)="auth.logout()" class="btn btn-sm btn-outline-danger">Salir</button>
            </div>
          </div>
        }

        <main class="flex-grow-1 p-3 p-md-4">
          <router-outlet />
        </main>
      </div>
    </div>

    @if (seccionPendiente()) {
      <app-pin-modal
        [seccionNombre]="seccionPendiente()!.nombre"
        (verificado)="alVerificarPin()"
        (cancelar)="seccionPendiente.set(null)"
      />
    }
  `,
  styles: `
    .admin-sidebar {
      width: 230px;
      flex-shrink: 0;
      background-color: #FFFFFF;
      position: sticky;
      top: 0;
      height: 100vh;
    }
    .vf-nav-item {
      color: #374151;
      border-radius: 10px;
      padding: 9px 12px;
      font-size: 0.93rem;
      font-weight: 500;
      line-height: 1.25;
    }
    .vf-nav-item:hover {
      background-color: #F9FAFB;
      color: #111827;
    }
    .vf-nav-item.active {
      background-color: var(--vf-primary-soft);
      color: var(--vf-primary);
      font-weight: 600;
    }
    .bg-vf-badge {
      background-color: var(--vf-primary);
      color: #fff;
      font-size: 0.72rem;
    }
  `,
})
export class AdminLayoutComponent implements OnInit {
  porAnularCount = signal(0);
  rutaActual = signal('');
  seccionPendiente = signal<SeccionProtegida | null>(null);
  menuMovilAbierto = signal(false);

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {
    this.rutaActual.set(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.rutaActual.set(e.urlAfterRedirects);
        const protegidas = ['/admin/anulaciones', '/admin/menu', '/admin/equipo'];
        if (!protegidas.includes(e.urlAfterRedirects)) {
          this.auth.pinDesbloqueadoSeccion.set(null);
        }
        this.cargarPendientes();
      });
  }

  ngOnInit() {
    this.cargarPendientes();
  }

  cargarPendientes() {
    this.api.getVentasPorAnular().subscribe({
      next: (list) => this.porAnularCount.set(list.length),
      error: () => {},
    });
  }

  irASeccionProtegida(ruta: string, nombre: string) {
    if (this.auth.pinDesbloqueadoSeccion() === ruta) {
      this.router.navigate([ruta]);
      return;
    }
    this.seccionPendiente.set({ ruta, nombre });
  }

  alVerificarPin() {
    const sec = this.seccionPendiente();
    this.seccionPendiente.set(null);
    if (sec) {
      this.auth.pinDesbloqueadoSeccion.set(sec.ruta);
      this.router.navigate([sec.ruta]);
    }
  }
}
