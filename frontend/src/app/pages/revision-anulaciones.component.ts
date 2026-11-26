import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { ClpPipe } from '../core/clp.pipe';
import { Venta } from '../core/models';

@Component({
  selector: 'app-revision-anulaciones',
  standalone: true,
  imports: [ClpPipe],
  template: `
    <div class="mb-4">
      <h3 class="fw-bold mb-1">Revisión de anulaciones</h3>
      <p class="text-muted small mb-2">
        Ventas que tu equipo marcó como "por anular". Rechazar la devuelve a vigente.
      </p>
      <div class="text-muted small">
        <i class="bi bi-lock me-1"></i> Sección protegida con PIN: se cierra al salir.
      </div>
    </div>

    @if (cargando()) {
      <div class="text-muted py-4">Cargando solicitudes...</div>
    } @else if (ventas().length === 0) {
      <div class="vf-card p-4 text-center text-muted">
        No hay ventas pendientes por anular.
      </div>
    } @else {
      <div class="d-flex flex-column gap-3">
        @for (v of ventas(); track v.id) {
          <div class="vf-card p-3 p-md-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div class="text-muted small mb-1">
                {{ v.vendedor_nombre }} · {{ v.fecha }} · {{ v.hora }} · {{ v.medio_pago_nombre }}
              </div>
              <div class="fw-bold fs-6 mb-1">
                {{ v.resumen_productos }} · {{ v.total | clp }}
              </div>
              <div class="text-muted small">
                Motivo: {{ v.motivo_solicitud || 'Sin motivo' }}
              </div>
            </div>
            <div class="d-flex gap-2 flex-shrink-0">
              <button
                type="button"
                class="btn btn-vf-outline px-3"
                (click)="rechazar(v)"
              >
                Rechazar
              </button>
              <button
                type="button"
                class="btn btn-danger px-3 fw-semibold"
                style="min-height: 44px; border-radius: 10px;"
                (click)="ventaAConfirmar.set(v)"
              >
                Confirmar anulación
              </button>
            </div>
          </div>
        }
      </div>
    }

    @if (ventaAConfirmar()) {
      <div class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3">
        <div class="bg-white rounded-4 p-4 shadow-lg w-100" style="max-width: 400px;">
          <h5 class="fw-bold mb-2">¿Confirmar anulación de {{ ventaAConfirmar()!.numero }}?</h5>
          <p class="text-muted small mb-4">
            Esta acción no se puede deshacer. La venta quedará excluida de los totales pero visible en el historial como "Anulada".
          </p>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-vf-outline flex-fill" (click)="ventaAConfirmar.set(null)">
              Cancelar
            </button>
            <button type="button" class="btn btn-danger flex-fill fw-semibold" (click)="confirmar()">
              Sí, anular
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
export class RevisionAnulacionesComponent implements OnInit {
  ventas = signal<Venta[]>([]);
  cargando = signal(true);
  ventaAConfirmar = signal<Venta | null>(null);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.api.getVentasPorAnular().subscribe({
      next: (list) => {
        this.ventas.set(list);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  rechazar(v: Venta) {
    this.api.restituirVenta(v.id).subscribe({
      next: () => this.cargar(),
    });
  }

  confirmar() {
    const v = this.ventaAConfirmar();
    if (!v) return;
    this.api.confirmarAnulacion(v.id).subscribe({
      next: () => {
        this.ventaAConfirmar.set(null);
        this.cargar();
      },
    });
  }
}
