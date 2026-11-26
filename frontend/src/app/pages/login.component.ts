import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div class="card border rounded-4 shadow-sm p-4 w-100 bg-white" style="max-width: 390px;">
        <div class="text-center mb-4">
          <div class="vf-logo-box mx-auto mb-3" style="width: 58px; height: 58px; font-size: 1rem;">
            VF
          </div>
          <h4 class="fw-bold mb-1">Venta Fácil</h4>
          <p class="text-muted small mb-0">Registra tus ventas en tres toques</p>
        </div>

        <form (ngSubmit)="ingresar()">
          <div class="mb-3">
            <label class="form-label fw-medium small">Identificador de acceso</label>
            <input
              type="text"
              class="form-control form-control-lg rounded-3"
              placeholder="juan.soto"
              [(ngModel)]="identificador"
              name="identificador"
              autocomplete="username"
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label fw-medium small">Contraseña</label>
            <input
              type="password"
              class="form-control form-control-lg rounded-3"
              [(ngModel)]="password"
              name="password"
              autocomplete="current-password"
              required
            />
          </div>

          @if (errorMsg()) {
            <div class="alert alert-danger py-2 px-3 small rounded-3 mb-3" role="alert">
              {{ errorMsg() }}
            </div>
          }

          <button
            type="submit"
            class="btn btn-vf-primary w-100 py-2 fs-6"
            [disabled]="cargando()"
          >
            {{ cargando() ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>

        <p class="text-muted text-center small mt-4 mb-0">
          ¿Problemas para entrar? Habla con el dueño del local.
        </p>

        <div class="border-top mt-4 pt-3">
          <div class="text-muted text-center mb-2" style="font-size: 0.75rem;">
            Acceso rápido de demostración
          </div>
          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-sm btn-vf-outline flex-fill"
              (click)="usarDemo('maria.perez', 'admin123')"
            >
              Admin (María)
            </button>
            <button
              type="button"
              class="btn btn-sm btn-vf-outline flex-fill"
              (click)="usarDemo('juan.soto', 'venta123')"
            >
              Vendedor (Juan)
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  identificador = '';
  password = '';
  errorMsg = signal('');
  cargando = signal(false);

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.estaAutenticado()) {
      this.redirigirSegunRol();
    }
  }

  usarDemo(id: string, pass: string) {
    this.identificador = id;
    this.password = pass;
    this.ingresar();
  }

  ingresar() {
    this.errorMsg.set('');
    this.cargando.set(true);
    this.auth.login(this.identificador.trim(), this.password).subscribe({
      next: () => {
        this.cargando.set(false);
        this.redirigirSegunRol();
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorMsg.set(err?.error?.detail || 'Identificador o contraseña incorrectos.');
      },
    });
  }

  private redirigirSegunRol() {
    if (this.auth.esAdmin()) {
      this.router.navigate(['/admin/inicio']);
    } else {
      this.router.navigate(['/vender']);
    }
  }
}
