import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ClpPipe } from '../core/clp.pipe';
import { Venta } from '../core/models';

@Component({
  selector: 'app-mis-ventas',
  standalone: true,
  imports: [FormsModule, ClpPipe],
  template: `
    <div class="mx-auto p-3" style="max-width: 560px;">
      <h5 class="fw-bold mb-3">Mis ventas de hoy</h5>

      <div class="rounded-4 p-3 mb-2 d-flex justify-content-between align-items-center" style="background-color: var(--vf-primary-light);">
        <div>
          <div class="small fw-medium text-vf-primary">Total de tu turno</div>
          <div class="fw-bold fs-2 text-vf-primary">{{ totalTurno() | clp }}</div>
        </div>
        <div class="text-end small text-vf-primary">
          <div>{{ cantidadVentas() }} {{ cantidadVentas() === 1 ? 'venta' : 'ventas' }}</div>
          @if (porAnularCount() > 0) {
            <div>{{ porAnularCount() }} por anular</div>
          }
        </div>
      </div>

      <p class="text-muted small mb-3">
        Las ventas por anular siguen sumando hasta que el administrador las revise.
      </p>

      @if (cargando()) {
        <div class="text-center text-muted py-4">Cargando ventas...</div>
      } @else if (ventas().length === 0) {
        <div class="vf-card p-4 text-center text-muted">
          Aún no hay registros para el día de hoy.
        </div>
      } @else {
        <div class="d-flex flex-column gap-2">
          @for (v of ventas(); track v.id) {
            <div class="vf-card p-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="text-muted small">
                  {{ v.numero }} · {{ v.hora }} · {{ v.medio_pago_nombre }}
                </span>
                @if (v.estado === 'vigente') {
                  <span class="badge-vigente">Vigente</span>
                } @else if (v.estado === 'por_anular') {
                  <span class="badge-por-anular">Por anular</span>
                } @else {
                  <span class="badge-anulada">Anulada</span>
                }
              </div>

              <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
                <span
                  class="fw-medium"
                  [class.text-decoration-line-through]="v.estado === 'anulada'"
                  [class.text-muted]="v.estado === 'anulada'"
                >
                  {{ v.resumen_productos }}
                </span>
                <span
                  class="fw-bold"
                  [class.text-decoration-line-through]="v.estado === 'anulada'"
                  [class.text-muted]="v.estado === 'anulada'"
                >
                  {{ v.total | clp }}
                </span>
              </div>

              @if (v.estado === 'vigente') {
                <button
                  type="button"
                  class="btn btn-link text-vf-primary text-decoration-none p-0 small fw-medium mt-1"
                  (click)="abrirModalAnulacion(v)"
                >
                  Solicitar anulación
                </button>
              }
            </div>
          }
        </div>
      }
    </div>

    @if (ventaASolicitar()) {
      <!-- Pantalla 6: Solicitar anulación -->
      <div class="modal-backdrop-custom d-flex align-items-end align-items-sm-center justify-content-center p-sm-3">
        <div class="bg-white rounded-top-4 rounded-sm-4 p-4 w-100 shadow-lg" style="max-width: 440px;">
          <h5 class="fw-bold mb-3">¿Solicitar anulación de la venta {{ ventaASolicitar()!.numero }}?</h5>

          <div class="vf-card p-3 mb-3 small">
            <div class="d-flex justify-content-between text-muted mb-1">
              <span>{{ ventaASolicitar()!.hora }} · {{ ventaASolicitar()!.medio_pago_nombre }}</span>
              <span class="fw-bold text-dark">{{ ventaASolicitar()!.total | clp }}</span>
            </div>
            <div>{{ ventaASolicitar()!.resumen_productos }}</div>
          </div>

          <div class="mb-3">
            <label class="form-label small fw-medium">Motivo (opcional)</label>
            <textarea
              class="form-control rounded-3"
              rows="2"
              placeholder="Ej: Me equivoqué de medio de pago"
              [(ngModel)]="motivo"
            ></textarea>
          </div>

          <p class="text-muted small mb-3">
            El administrador la revisará. Mientras tanto, la venta sigue sumando en tu turno.
          </p>

          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-vf-outline flex-fill"
              (click)="ventaASolicitar.set(null)"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="btn btn-vf-primary flex-fill"
              [disabled]="enviando()"
              (click)="confirmarSolicitud()"
            >
              {{ enviando() ? 'Enviando...' : 'Solicitar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .modal-backdrop-custom {
      position: fixed;
      inset: 0;
      background: rgba(17, 24, 39, 0.45);
      z-index: 1050;
    }
  `,
})
export class MisVentasComponent implements OnInit {
  totalTurno = signal(0);
  cantidadVentas = signal(0);
  porAnularCount = signal(0);
  ventas = signal<Venta[]>([]);
  cargando = signal(true);

  ventaASolicitar = signal<Venta | null>(null);
  motivo = '';
  enviando = signal(false);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.api.getMisVentas().subscribe({
      next: (res) => {
        this.totalTurno.set(res.total_turno);
        this.cantidadVentas.set(res.cantidad_ventas);
        this.porAnularCount.set(res.por_anular_count);
        this.ventas.set(res.ventas);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  abrirModalAnulacion(v: Venta) {
    this.motivo = '';
    this.ventaASolicitar.set(v);
  }

  confirmarSolicitud() {
    const v = this.ventaASolicitar();
    if (!v) return;
    this.enviando.set(true);
    this.api.solicitarAnulacion(v.id, this.motivo.trim()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.ventaASolicitar.set(null);
        this.cargar();
      },
      error: () => this.enviando.set(false),
    });
  }
}
