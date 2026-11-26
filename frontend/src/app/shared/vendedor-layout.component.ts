import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-vendedor-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="vendedor-shell d-flex flex-column min-vh-100 mx-auto bg-white border-start border-end">
      <header class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-white sticky-top">
        <div>
          <div class="text-muted" style="font-size: 0.72rem;">Venta Fácil · {{ auth.usuario()?.negocio_nombre }}</div>
          <div class="fw-bold fs-6">{{ auth.usuario()?.nombre }}</div>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-link text-vf-primary text-decoration-none fw-medium"
          (click)="auth.logout()"
        >
          Salir
        </button>
      </header>

      <main class="flex-grow-1 pb-5 mb-4">
        <router-outlet />
      </main>

      <nav class="vendedor-bottom-nav d-flex border-top bg-white fixed-bottom mx-auto">
        <a
          routerLink="/vender"
          routerLinkActive="active"
          class="flex-fill text-center py-3 text-decoration-none fw-semibold"
        >
          Vender
        </a>
        <a
          routerLink="/mis-ventas"
          routerLinkActive="active"
          class="flex-fill text-center py-3 text-decoration-none fw-semibold"
        >
          Mis ventas
        </a>
      </nav>
    </div>
  `,
  styles: `
    .vendedor-shell {
      max-width: 480px;
    }
    .vendedor-bottom-nav {
      max-width: 480px;
      z-index: 1030;
    }
    .vendedor-bottom-nav a {
      color: #6B7280;
      border-top: 2.5px solid transparent;
      font-size: 0.95rem;
    }
    .vendedor-bottom-nav a.active {
      color: var(--vf-primary);
      border-top-color: var(--vf-primary);
    }
  `,
})
export class VendedorLayoutComponent {
  constructor(public auth: AuthService) {}
}
