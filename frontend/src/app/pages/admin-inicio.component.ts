import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ClpPipe } from '../core/clp.pipe';
import { ResumenNegocio } from '../core/models';
import { PinModalComponent } from '../shared/pin-modal.component';

@Component({
  selector: 'app-admin-inicio',
  standalone: true,
  imports: [RouterLink, ClpPipe, PinModalComponent],
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        <h3 class="fw-bold mb-1">Hola, {{ primerNombre() }}</h3>
        <div class="text-muted small">{{ fechaHoyTexto() }} · hoy en tu local</div>
      </div>
      <a routerLink="/admin/vender" class="btn btn-vf-primary px-4">
        Nueva venta
      </a>
    </div>

    @if (resumen()) {
      @if (resumen()!.por_anular_count > 0) {
        <div class="vf-banner-aviso d-flex justify-content-between align-items-center mb-4">
          <span class="small">
            <strong>{{ resumen()!.por_anular_count }} {{ resumen()!.por_anular_count === 1 ? 'venta por anular' : 'ventas por anular' }}</strong>
            esperan tu revisión.
          </span>
          <button
            type="button"
            class="btn btn-link text-vf-primary text-decoration-none fw-semibold small p-0"
            (click)="mostrarPinAnulaciones.set(true)"
          >
            Revisar
          </button>
        </div>
      }

      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="vf-card p-3 h-100">
            <div class="text-muted small mb-1">Vendido hoy</div>
            <div class="fw-bold fs-2">{{ resumen()!.total_vendido | clp }}</div>
            @if (resumen()!.anuladas_count > 0) {
              <div class="text-muted" style="font-size: 0.78rem;">Sin contar las anuladas</div>
            }
          </div>
        </div>
        <div class="col-md-4">
          <div class="vf-card p-3 h-100">
            <div class="text-muted small mb-1">Ventas de hoy</div>
            <div class="fw-bold fs-2">{{ resumen()!.numero_ventas }}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="vf-card p-3 h-100">
            <div class="text-muted small mb-1">Ticket promedio</div>
            <div class="fw-bold fs-2">{{ resumen()!.ticket_promedio | clp }}</div>
          </div>
        </div>
      </div>

      <h6 class="fw-bold mb-3">Últimas ventas</h6>
      <div class="vf-card overflow-hidden mb-3">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr class="small text-muted">
                <th>N.°</th>
                <th>Hora</th>
                <th>Vendedor</th>
                <th>Medio de pago</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (v of resumen()!.ultimas_ventas; track v.id) {
                <tr>
                  <td class="fw-medium">{{ v.numero }}</td>
                  <td>{{ v.hora }}</td>
                  <td>{{ v.vendedor_nombre }}</td>
                  <td>{{ v.medio_pago_nombre }}</td>
                  <td class="fw-semibold">{{ v.total | clp }}</td>
                  <td>
                    @if (v.estado === 'vigente') {
                      <span class="badge-vigente">Vigente</span>
                    } @else if (v.estado === 'por_anular') {
                      <span class="badge-por-anular">Por anular</span>
                    } @else {
                      <span class="badge-anulada">Anulada</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <a routerLink="/admin/historial" class="text-vf-primary text-decoration-none small fw-semibold">
        Ver todo el historial
      </a>
    }

    @if (mostrarPinAnulaciones()) {
      <app-pin-modal
        seccionNombre="Revisión de anulaciones"
        (verificado)="irARevision()"
        (cancelar)="mostrarPinAnulaciones.set(false)"
      />
    }
  `,
})
export class AdminInicioComponent implements OnInit {
  resumen = signal<ResumenNegocio | null>(null);
  mostrarPinAnulaciones = signal(false);

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.api.getResumen('hoy').subscribe({
      next: (r) => this.resumen.set(r),
    });
  }

  primerNombre(): string {
    return (this.auth.usuario()?.nombre || '').split(' ')[0];
  }

  fechaHoyTexto(): string {
    const f = new Date().toLocaleDateString('es-CL', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return f.charAt(0).toUpperCase() + f.slice(1);
  }

  irARevision() {
    this.mostrarPinAnulaciones.set(false);
    this.auth.pinDesbloqueadoSeccion.set('/admin/anulaciones');
    this.router.navigate(['/admin/anulaciones']);
  }
}
