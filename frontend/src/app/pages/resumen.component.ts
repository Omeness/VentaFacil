import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ClpPipe } from '../core/clp.pipe';
import { ResumenNegocio } from '../core/models';
import { PinModalComponent } from '../shared/pin-modal.component';

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [FormsModule, ClpPipe, PinModalComponent],
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
      <div>
        <h3 class="fw-bold mb-1">Resumen</h3>
        @if (resumen()) {
          <div class="text-muted small">
            @if (resumen()!.desde === resumen()!.hasta) {
              {{ resumen()!.desde }}
            } @else {
              {{ resumen()!.desde }} al {{ resumen()!.hasta }}
            }
          </div>
        }
      </div>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-vf-outline px-3" (click)="exportarExcel()">
          Exportar a Excel
        </button>
        <button type="button" class="btn btn-vf-outline px-3" (click)="imprimirPdf()">
          Descargar PDF
        </button>
      </div>
    </div>

    <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
      <button
        type="button"
        class="btn rounded-pill px-3 btn-sm fw-semibold"
        [class.btn-dark]="periodo() === 'hoy'"
        [class.btn-vf-outline]="periodo() !== 'hoy'"
        (click)="cambiarPeriodo('hoy')"
      >
        Hoy
      </button>
      <button
        type="button"
        class="btn rounded-pill px-3 btn-sm fw-semibold"
        [class.btn-dark]="periodo() === 'semana'"
        [class.btn-vf-outline]="periodo() !== 'semana'"
        (click)="cambiarPeriodo('semana')"
      >
        Esta semana
      </button>
      <button
        type="button"
        class="btn rounded-pill px-3 btn-sm fw-semibold"
        [class.btn-dark]="periodo() === 'mes'"
        [class.btn-vf-outline]="periodo() !== 'mes'"
        (click)="cambiarPeriodo('mes')"
      >
        Este mes
      </button>
      <button
        type="button"
        class="btn rounded-pill px-3 btn-sm fw-semibold"
        [class.btn-dark]="periodo() === 'rango'"
        [class.btn-vf-outline]="periodo() !== 'rango'"
        (click)="periodo.set('rango')"
      >
        Elegir fechas
      </button>
    </div>

    @if (periodo() === 'rango') {
      <div class="vf-card p-3 mb-3 d-flex flex-wrap align-items-end gap-3">
        <div>
          <label class="form-label small mb-1">Desde</label>
          <input type="date" class="form-control" [(ngModel)]="desde" />
        </div>
        <div>
          <label class="form-label small mb-1">Hasta</label>
          <input type="date" class="form-control" [(ngModel)]="hasta" />
        </div>
        <button type="button" class="btn btn-vf-primary px-3" (click)="cargar()">Aplicar</button>
        @if (errorMsg()) {
          <div class="text-danger small">{{ errorMsg() }}</div>
        }
      </div>
    }

    @if (resumen()) {
      @if (resumen()!.por_anular_count > 0) {
        <div class="vf-banner-aviso d-flex justify-content-between align-items-center mb-4">
          <span class="small">
            <strong>{{ resumen()!.por_anular_count }} {{ resumen()!.por_anular_count === 1 ? 'venta por anular' : 'ventas por anular' }}</strong>
            siguen sumando hasta que las revises.
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
            <div class="text-muted small mb-1">Total vendido</div>
            <div class="fw-bold fs-2">{{ resumen()!.total_vendido | clp }}</div>
            @if (resumen()!.anuladas_count > 0) {
              <div class="text-muted" style="font-size: 0.78rem;">
                Excluye {{ resumen()!.anuladas_count }} {{ resumen()!.anuladas_count === 1 ? 'venta anulada' : 'ventas anuladas' }}
              </div>
            }
          </div>
        </div>
        <div class="col-md-4">
          <div class="vf-card p-3 h-100">
            <div class="text-muted small mb-1">Número de ventas</div>
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

      <div class="row g-3">
        <div class="col-lg-6">
          <div class="vf-card p-4 h-100">
            <h6 class="fw-bold mb-3">Por medio de pago</h6>
            <div class="d-flex flex-column gap-3">
              @for (mp of resumen()!.por_medio_pago; track mp.codigo) {
                <div class="d-flex align-items-center gap-3">
                  <div class="small" style="width: 105px;">{{ mp.nombre }}</div>
                  <div class="flex-grow-1">
                    <div class="progress bg-light" style="height: 10px; border-radius: 999px;">
                      <div
                        class="progress-bar"
                        style="background-color: var(--vf-primary); border-radius: 999px;"
                        [style.width.%]="porcentajeMedio(mp.total)"
                      ></div>
                    </div>
                  </div>
                  <div class="fw-semibold small text-end" style="width: 85px;">
                    {{ mp.total | clp }}
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="vf-card p-4 h-100">
            <h6 class="fw-bold mb-3">Más vendidos</h6>
            @if (resumen()!.mas_vendidos.length === 0) {
              <div class="text-muted small">Sin ventas en este período.</div>
            } @else {
              <div class="d-flex flex-column gap-2">
                @for (item of resumen()!.mas_vendidos; track item.nombre_producto; let idx = $index) {
                  <div class="d-flex justify-content-between align-items-center py-1">
                    <span class="small">{{ idx + 1 }}. {{ item.nombre_producto }}</span>
                    <span class="fw-bold small">{{ item.unidades }} u.</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
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
export class ResumenComponent implements OnInit {
  periodo = signal('hoy');
  desde = '';
  hasta = '';
  resumen = signal<ResumenNegocio | null>(null);
  errorMsg = signal('');
  mostrarPinAnulaciones = signal(false);

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {
    const hoyStr = new Date().toISOString().slice(0, 10);
    this.desde = hoyStr;
    this.hasta = hoyStr;
  }

  ngOnInit() {
    this.cargar();
  }

  cambiarPeriodo(p: string) {
    this.periodo.set(p);
    this.cargar();
  }

  cargar() {
    this.errorMsg.set('');
    this.api
      .getResumen(
        this.periodo(),
        this.periodo() === 'rango' ? this.desde : undefined,
        this.periodo() === 'rango' ? this.hasta : undefined
      )
      .subscribe({
        next: (r) => this.resumen.set(r),
        error: (err) => this.errorMsg.set(err?.error?.detail || 'Error al cargar resumen.'),
      });
  }

  maxMedio = computed(() => {
    const list = this.resumen()?.por_medio_pago || [];
    return Math.max(...list.map((m) => m.total), 1);
  });

  porcentajeMedio(total: number): number {
    if (total === 0) return 0;
    return Math.max(8, Math.round((total / this.maxMedio()) * 100));
  }

  exportarExcel() {
    const hoy = new Date();
    let dDesde = hoy.toISOString().slice(0, 10);
    let dHasta = dDesde;
    if (this.periodo() === 'semana') {
      const diff = (hoy.getDay() + 6) % 7;
      const lun = new Date(hoy);
      lun.setDate(hoy.getDate() - diff);
      dDesde = lun.toISOString().slice(0, 10);
    } else if (this.periodo() === 'mes') {
      dDesde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
    } else if (this.periodo() === 'rango') {
      dDesde = this.desde;
      dHasta = this.hasta;
    }

    this.api.exportarExcel({ desde: dDesde, hasta: dHasta }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resumen_${dDesde}_${dHasta}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => alert('No hay ventas para exportar en este período.'),
    });
  }

  imprimirPdf() {
    window.print();
  }

  irARevision() {
    this.mostrarPinAnulaciones.set(false);
    this.auth.pinDesbloqueadoSeccion.set('/admin/anulaciones');
    this.router.navigate(['/admin/anulaciones']);
  }
}
