import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ClpPipe } from '../core/clp.pipe';
import { MedioPago, UsuarioEquipo, Venta } from '../core/models';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [FormsModule, ClpPipe],
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        <h3 class="fw-bold mb-1">Historial de ventas</h3>
        <p class="text-muted small mb-0">
          Solo consulta. Las anulaciones se solicitan desde Mis ventas.
        </p>
      </div>
      <button type="button" class="btn btn-vf-outline px-3" (click)="exportarExcel()">
        Exportar a Excel
      </button>
    </div>

    <div class="vf-card p-3 mb-4">
      <div class="row g-2 align-items-end">
        <div class="col-6 col-md">
          <label class="form-label small text-muted mb-1">Desde</label>
          <input type="date" class="form-control" [(ngModel)]="desde" (change)="buscar()" />
        </div>
        <div class="col-6 col-md">
          <label class="form-label small text-muted mb-1">Hasta</label>
          <input type="date" class="form-control" [(ngModel)]="hasta" (change)="buscar()" />
        </div>
        <div class="col-6 col-md">
          <label class="form-label small text-muted mb-1">Medio de pago</label>
          <select class="form-select" [(ngModel)]="medioPago" (change)="buscar()">
            <option value="todos">Todos</option>
            @for (mp of medios(); track mp.codigo) {
              <option [value]="mp.codigo">{{ mp.nombre }}</option>
            }
          </select>
        </div>
        <div class="col-6 col-md">
          <label class="form-label small text-muted mb-1">Vendedor</label>
          <select class="form-select" [(ngModel)]="vendedor" (change)="buscar()">
            <option value="todos">Todos</option>
            @for (u of usuarios(); track u.id) {
              <option [value]="u.id">{{ u.nombre }}</option>
            }
          </select>
        </div>
        <div class="col-12 col-md">
          <label class="form-label small text-muted mb-1">Estado</label>
          <select class="form-select" [(ngModel)]="estado" (change)="buscar()">
            <option value="todos">Todos</option>
            <option value="vigente">Vigente</option>
            <option value="por_anular">Por anular</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
      </div>
      @if (errorMsg()) {
        <div class="text-danger small mt-2">{{ errorMsg() }}</div>
      }
    </div>

    @if (ventas().length === 0 && !errorMsg()) {
      <div class="vf-card p-4 text-center text-muted">
        No se encontraron ventas para los filtros seleccionados.
      </div>
    } @else if (ventas().length > 0) {
      <div class="vf-card overflow-hidden mb-3">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr class="small text-muted">
                <th>N.°</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Vendedor</th>
                <th>Productos</th>
                <th>Medio de pago</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (v of ventas(); track v.id) {
                <tr>
                  <td class="fw-medium">{{ v.numero }}</td>
                  <td class="text-nowrap">{{ v.fecha }}</td>
                  <td>{{ v.hora }}</td>
                  <td>{{ v.vendedor_nombre }}</td>
                  <td class="small">{{ v.resumen_productos }}</td>
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

      <div class="text-muted small">
        Mostrando {{ ventas().length }} de {{ totalRegistros() }} ventas
        @if (ventas().length < totalRegistros()) {
          · <button type="button" class="btn btn-link text-vf-primary p-0 small fw-semibold text-decoration-none" (click)="verMas()">Ver más</button>
        }
      </div>
    }
  `,
})
export class HistorialComponent implements OnInit {
  desde = '';
  hasta = '';
  medioPago = 'todos';
  vendedor = 'todos';
  estado = 'todos';
  limit = 20;

  medios = signal<MedioPago[]>([]);
  usuarios = signal<UsuarioEquipo[]>([]);
  ventas = signal<Venta[]>([]);
  totalRegistros = signal(0);
  errorMsg = signal('');

  constructor(private api: ApiService) {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.desde = inicioMes.toISOString().slice(0, 10);
    this.hasta = hoy.toISOString().slice(0, 10);
  }

  ngOnInit() {
    this.api.getMediosPago().subscribe((m) => this.medios.set(m));
    this.api.getUsuarios().subscribe((u) => this.usuarios.set(u));
    this.buscar();
  }

  buscar() {
    this.errorMsg.set('');
    this.api
      .getHistorial({
        desde: this.desde,
        hasta: this.hasta,
        medio_pago: this.medioPago,
        vendedor: this.vendedor,
        estado: this.estado,
        limit: this.limit,
      })
      .subscribe({
        next: (res) => {
          this.ventas.set(res.ventas);
          this.totalRegistros.set(res.total_registros);
        },
        error: (err) => {
          this.ventas.set([]);
          this.errorMsg.set(err?.error?.detail || 'Error al consultar el historial.');
        },
      });
  }

  verMas() {
    this.limit += 30;
    this.buscar();
  }

  exportarExcel() {
    this.api
      .exportarExcel({
        desde: this.desde,
        hasta: this.hasta,
        medio_pago: this.medioPago,
        vendedor: this.vendedor,
        estado: this.estado,
      })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `historial_ventas_${this.desde}_${this.hasta}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (err) => {
          alert(err?.error?.detail || 'No hay ventas para exportar.');
        },
      });
  }
}
