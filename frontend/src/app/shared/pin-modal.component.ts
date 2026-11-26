import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-pin-modal',
  standalone: true,
  template: `
    <div class="pin-backdrop d-flex align-items-center justify-content-center p-3">
      <div class="pin-card bg-white rounded-4 shadow-lg p-4 w-100" style="max-width: 360px;">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="pin-icon-circle d-flex align-items-center justify-content-center">
            <i class="bi bi-lock text-vf-primary fs-5"></i>
          </div>
          <button
            type="button"
            class="btn btn-link text-vf-primary text-decoration-none fw-semibold p-0"
            (click)="cancelar.emit()"
          >
            Cancelar
          </button>
        </div>

        <h5 class="fw-bold mb-2">Ingresa tu PIN</h5>
        <p class="text-muted small mb-4">
          {{ seccionNombre }} es una sección protegida. Ingresa tu PIN de 4 dígitos; la sección se cierra cuando sales de ella.
        </p>

        <div class="d-flex justify-content-center gap-3 mb-3">
          @for (i of [0, 1, 2, 3]; track i) {
            <span class="pin-dot" [class.filled]="pin().length > i"></span>
          }
        </div>

        @if (errorMsg()) {
          <div class="alert alert-danger py-2 px-3 small text-center mb-3">
            {{ errorMsg() }}
          </div>
        }

        <div class="row g-2 mb-3">
          @for (num of ['1', '2', '3', '4', '5', '6', '7', '8', '9']; track num) {
            <div class="col-4">
              <button
                type="button"
                class="btn btn-vf-outline w-100 py-2 fs-5 fw-semibold"
                (click)="agregarDigito(num)"
              >
                {{ num }}
              </button>
            </div>
          }
          <div class="col-4">
            <button
              type="button"
              class="btn btn-vf-outline w-100 py-2 fw-medium"
              (click)="borrar()"
            >
              Borrar
            </button>
          </div>
          <div class="col-4">
            <button
              type="button"
              class="btn btn-vf-outline w-100 py-2 fs-5 fw-semibold"
              (click)="agregarDigito('0')"
            >
              0
            </button>
          </div>
          <div class="col-4">
            <button
              type="button"
              class="btn btn-vf-primary w-100 py-2 fw-semibold"
              [disabled]="pin().length !== 4 || cargando()"
              (click)="enviar()"
            >
              Entrar
            </button>
          </div>
        </div>

        <p class="text-muted text-center mb-0" style="font-size: 0.78rem;">
          Tras 5 intentos fallidos, el PIN se bloquea por unos minutos.
        </p>
      </div>
    </div>
  `,
  styles: `
    .pin-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(17, 24, 39, 0.45);
      z-index: 1060;
    }
    .pin-icon-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: var(--vf-primary-soft);
    }
    .pin-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1.5px solid #9CA3AF;
      background-color: transparent;
      display: inline-block;
    }
    .pin-dot.filled {
      background-color: #111827;
      border-color: #111827;
    }
  `,
})
export class PinModalComponent {
  @Input() seccionNombre = 'Esta sección';
  @Output() verificado = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  pin = signal('');
  errorMsg = signal('');
  cargando = signal(false);

  constructor(private auth: AuthService) {}

  agregarDigito(d: string) {
    if (this.pin().length < 4) {
      this.errorMsg.set('');
      this.pin.update((p) => p + d);
    }
  }

  borrar() {
    this.errorMsg.set('');
    this.pin.update((p) => p.slice(0, -1));
  }

  enviar() {
    if (this.pin().length !== 4) return;
    this.cargando.set(true);
    this.errorMsg.set('');
    this.auth.verifyPin(this.pin()).subscribe({
      next: () => {
        this.cargando.set(false);
        this.verificado.emit();
      },
      error: (err) => {
        this.cargando.set(false);
        this.pin.set('');
        this.errorMsg.set(err?.error?.detail || 'PIN incorrecto.');
      },
    });
  }
}
