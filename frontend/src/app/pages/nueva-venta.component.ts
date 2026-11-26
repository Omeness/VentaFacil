import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ClpPipe } from '../core/clp.pipe';
import { MedioPago, Producto, Venta } from '../core/models';

interface GrupoProductos {
  titulo: string;
  productos: Producto[];
}

@Component({
  selector: 'app-nueva-venta',
  standalone: true,
  imports: [FormsModule, ClpPipe],
  template: `
    @if (pantallaEstado() === 'registrada' && ultimaVenta()) {
      <!-- Pantalla 3: Venta registrada -->
      <div class="d-flex flex-column align-items-center justify-content-center p-4 text-center mx-auto" style="max-width: 460px; min-height: 70vh;">
        <div class="rounded-circle d-flex align-items-center justify-content-center mb-3" style="width: 64px; height: 64px; background: #E8F5E9;">
          <i class="bi bi-check-lg text-success fs-2"></i>
        </div>
        <h4 class="fw-bold mb-1">Venta registrada</h4>
        <p class="text-muted small mb-4">
          {{ ultimaVenta()!.total | clp }} · {{ ultimaVenta()!.medio_pago_nombre }} · {{ ultimaVenta()!.hora }}
        </p>

        <div class="vf-card p-3 w-100 text-start mb-4">
          @for (d of ultimaVenta()!.detalles; track d.id) {
            <div class="d-flex justify-content-between py-1 small">
              <span>{{ d.cantidad }} × {{ d.nombre_producto }}</span>
              <span class="fw-medium">{{ d.subtotal | clp }}</span>
            </div>
          }
          <div class="border-top mt-2 pt-2 d-flex justify-content-between fw-bold">
            <span>Total</span>
            <span>{{ ultimaVenta()!.total | clp }}</span>
          </div>
        </div>

        <button type="button" class="btn btn-vf-primary w-100 py-3" (click)="nuevaVenta()">
          Nueva venta
        </button>
      </div>
    } @else if (pantallaEstado() === 'sin_conexion') {
      <!-- Pantalla 4: Sin conexión -->
      <div class="d-flex flex-column align-items-center justify-content-center p-4 text-center mx-auto" style="max-width: 460px; min-height: 70vh;">
        <div class="rounded-circle d-flex align-items-center justify-content-center mb-3" style="width: 64px; height: 64px; background: #FEF3C7;">
          <i class="bi bi-wifi-off fs-3" style="color: #B45309;"></i>
        </div>
        <h4 class="fw-bold mb-2">No pudimos registrar la venta</h4>
        <p class="text-muted small mb-4">
          Revisa tu conexión. La venta sigue guardada en pantalla y puedes reintentar sin que se duplique.
        </p>

        <div class="vf-card p-3 w-100 text-start mb-4">
          @for (item of itemsCarrito(); track item.producto.id) {
            <div class="d-flex justify-content-between py-1 small">
              <span>{{ item.cantidad }} × {{ item.producto.nombre }}</span>
              <span class="fw-medium">{{ item.producto.precio_vigente * item.cantidad | clp }}</span>
            </div>
          }
          <div class="border-top mt-2 pt-2 d-flex justify-content-between fw-bold">
            <span>Total · {{ nombreMedioSeleccionado() }}</span>
            <span>{{ totalCarrito() | clp }}</span>
          </div>
        </div>

        <button
          type="button"
          class="btn btn-vf-primary w-100 py-3 mb-2"
          [disabled]="enviando()"
          (click)="confirmarVenta()"
        >
          {{ enviando() ? 'Reintentando...' : 'Reintentar' }}
        </button>
        <button
          type="button"
          class="btn btn-link text-vf-primary text-decoration-none fw-medium"
          (click)="pantallaEstado.set('armando')"
        >
          Volver a la venta
        </button>
      </div>
    } @else {
      <!-- Pantalla 2: Nueva venta -->
      <div class="mx-auto" style="max-width: 560px;">
        <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-white">
          <div>
            <h5 class="fw-bold mb-0">Nueva venta</h5>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button
              type="button"
              class="btn btn-sm btn-link text-muted text-decoration-none p-1"
              title="Simular caída de conexión (demo)"
              (click)="simularOffline.set(!simularOffline())"
            >
              <i class="bi" [class.bi-wifi-off]="simularOffline()" [class.bi-wifi]="!simularOffline()" [class.text-danger]="simularOffline()"></i>
            </button>
            <button
              type="button"
              class="btn btn-sm btn-link text-dark p-1"
              (click)="mostrarBuscador.set(!mostrarBuscador())"
            >
              <i class="bi bi-search fs-5"></i>
            </button>
          </div>
        </div>

        @if (simularOffline()) {
          <div class="bg-warning-subtle text-warning-emphasis small px-3 py-1 text-center">
            Modo demo sin conexión activado (se mostrará la pantalla de reintento al confirmar)
          </div>
        }

        @if (mostrarBuscador()) {
          <div class="px-3 pt-2">
            <input
              type="search"
              class="form-control rounded-3"
              placeholder="Buscar producto..."
              [ngModel]="busqueda()"
              (ngModelChange)="busqueda.set($event)"
            />
          </div>
        }

        <div class="p-3" style="padding-bottom: 240px !important;">
          @for (grupo of gruposFiltrados(); track grupo.titulo) {
            <div class="mb-3">
              <div class="text-muted fw-semibold small mb-2">{{ grupo.titulo }}</div>
              <div class="row g-2">
                @for (prod of grupo.productos; track prod.id) {
                  <div class="col-6">
                    <div
                      class="prod-card p-3 rounded-4 position-relative h-100 d-flex flex-column justify-content-between"
                      [class.selected]="cantidadDe(prod.id) > 0"
                      (click)="sumar(prod)"
                    >
                      @if (cantidadDe(prod.id) > 0) {
                        <span class="prod-badge">{{ cantidadDe(prod.id) }}</span>
                      }
                      <div class="fw-medium mb-2 pe-2" style="font-size: 0.94rem;">
                        {{ prod.nombre }}
                      </div>
                      <div class="d-flex align-items-center justify-content-between">
                        <span class="fw-bold">{{ prod.precio_vigente | clp }}</span>
                        @if (cantidadDe(prod.id) > 0) {
                          <div class="d-flex align-items-center gap-1" (click)="$event.stopPropagation()">
                            <button
                              type="button"
                              class="btn btn-sm btn-outline-secondary rounded-circle p-0 qty-btn"
                              (click)="restar(prod)"
                            >
                              −
                            </button>
                            <button
                              type="button"
                              class="btn btn-sm btn-vf-primary rounded-circle p-0 qty-btn"
                              (click)="sumar(prod)"
                            >
                              +
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Panel fijo inferior de pago y confirmación -->
        <div class="checkout-bar bg-white border-top p-3 mx-auto">
          <div class="d-flex justify-content-between align-items-baseline mb-2">
            <span class="text-muted small">
              {{ totalUnidades() }} {{ totalUnidades() === 1 ? 'producto' : 'productos' }}
            </span>
            <span class="fw-bold fs-4">{{ totalCarrito() | clp }}</span>
          </div>

          <div class="row g-2 mb-2">
            @for (mp of mediosPago(); track mp.codigo) {
              <div class="col-6">
                <button
                  type="button"
                  class="btn w-100 vf-touch-btn fw-semibold rounded-3"
                  [class.btn-vf-primary]="medioSeleccionado() === mp.codigo"
                  [class.btn-vf-outline]="medioSeleccionado() !== mp.codigo"
                  (click)="medioSeleccionado.set(mp.codigo)"
                >
                  {{ mp.nombre }}
                </button>
              </div>
            }
          </div>

          @if (errorMsg()) {
            <div class="text-danger small text-center mb-2">{{ errorMsg() }}</div>
          }

          <button
            type="button"
            class="btn btn-vf-primary w-100 py-2 fs-6"
            [disabled]="totalUnidades() === 0 || !medioSeleccionado() || enviando()"
            (click)="confirmarVenta()"
          >
            {{ enviando() ? 'Registrando...' : 'Confirmar venta' }}
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .prod-card {
      border: 1px solid var(--vf-border);
      background-color: #fff;
      cursor: pointer;
      user-select: none;
      transition: border-color 0.12s ease;
    }
    .prod-card.selected {
      border: 1.5px solid var(--vf-primary);
    }
    .prod-badge {
      position: absolute;
      top: -8px;
      right: -6px;
      min-width: 24px;
      height: 24px;
      border-radius: 999px;
      background-color: var(--vf-primary);
      color: #fff;
      font-size: 0.78rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
    }
    .qty-btn {
      width: 30px;
      height: 30px;
      min-height: 30px;
      line-height: 1;
      font-weight: 700;
    }
    .checkout-bar {
      position: sticky;
      bottom: 54px;
      z-index: 1020;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);
    }
  `,
})
export class NuevaVentaComponent implements OnInit {
  productos = signal<Producto[]>([]);
  masVendidosIds = signal<number[]>([]);
  mediosPago = signal<MedioPago[]>([]);

  carrito = signal<Record<number, number>>({});
  medioSeleccionado = signal<string>('');
  idClienteActual = signal<string>(crypto.randomUUID());

  busqueda = signal('');
  mostrarBuscador = signal(false);
  simularOffline = signal(false);

  pantallaEstado = signal<'armando' | 'registrada' | 'sin_conexion'>('armando');
  ultimaVenta = signal<Venta | null>(null);
  enviando = signal(false);
  errorMsg = signal('');

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getProductosMenuActivo().subscribe({
      next: (res) => {
        this.productos.set(res.productos);
        this.masVendidosIds.set(res.mas_vendidos_ids);
      },
    });
    this.api.getMediosPago().subscribe({
      next: (list) => this.mediosPago.set(list),
    });
  }

  gruposFiltrados = computed<GrupoProductos[]>(() => {
    const q = this.busqueda().trim().toLowerCase();
    const prods = this.productos().filter((p) =>
      q ? p.nombre.toLowerCase().includes(q) : true
    );

    const grupos: GrupoProductos[] = [];

    if (!q && this.masVendidosIds().length > 0) {
      const top = this.masVendidosIds()
        .map((id) => prods.find((p) => p.id === id))
        .filter((p): p is Producto => !!p);
      if (top.length > 0) {
        grupos.push({ titulo: 'Más vendidos', productos: top });
      }
    }

    const porCat = new Map<string, Producto[]>();
    for (const p of prods) {
      const cat = p.categoria || 'Otros';
      if (!porCat.has(cat)) porCat.set(cat, []);
      porCat.get(cat)!.push(p);
    }
    for (const [titulo, list] of porCat.entries()) {
      grupos.push({ titulo, productos: list });
    }
    return grupos;
  });

  cantidadDe(prodId: number): number {
    return this.carrito()[prodId] || 0;
  }

  sumar(prod: Producto) {
    this.errorMsg.set('');
    this.carrito.update((c) => ({ ...c, [prod.id]: (c[prod.id] || 0) + 1 }));
  }

  restar(prod: Producto) {
    this.carrito.update((c) => {
      const next = { ...c };
      const actual = next[prod.id] || 0;
      if (actual <= 1) {
        delete next[prod.id];
      } else {
        next[prod.id] = actual - 1;
      }
      return next;
    });
  }

  itemsCarrito = computed(() => {
    const c = this.carrito();
    return Object.entries(c)
      .map(([id, cantidad]) => ({
        producto: this.productos().find((p) => p.id === Number(id))!,
        cantidad,
      }))
      .filter((x) => !!x.producto);
  });

  totalUnidades = computed(() =>
    this.itemsCarrito().reduce((acc, item) => acc + item.cantidad, 0)
  );

  totalCarrito = computed(() =>
    this.itemsCarrito().reduce(
      (acc, item) => acc + item.producto.precio_vigente * item.cantidad,
      0
    )
  );

  nombreMedioSeleccionado = computed(() => {
    const mp = this.mediosPago().find((m) => m.codigo === this.medioSeleccionado());
    return mp?.nombre || '';
  });

  confirmarVenta() {
    if (this.totalUnidades() === 0 || !this.medioSeleccionado()) return;

    if (this.simularOffline()) {
      this.simularOffline.set(false);
      this.pantallaEstado.set('sin_conexion');
      return;
    }

    this.enviando.set(true);
    this.errorMsg.set('');
    const payload = {
      items: this.itemsCarrito().map((i) => ({
        producto_id: i.producto.id,
        cantidad: i.cantidad,
      })),
      medio_pago: this.medioSeleccionado(),
      id_cliente: this.idClienteActual(),
    };

    this.api.registrarVenta(payload).subscribe({
      next: (venta) => {
        this.enviando.set(false);
        this.ultimaVenta.set(venta);
        this.pantallaEstado.set('registrada');
      },
      error: (err) => {
        this.enviando.set(false);
        if (err.status === 0) {
          this.pantallaEstado.set('sin_conexion');
        } else {
          this.errorMsg.set(err?.error?.detail || 'No se pudo registrar la venta.');
        }
      },
    });
  }

  nuevaVenta() {
    this.carrito.set({});
    this.medioSeleccionado.set('');
    this.idClienteActual.set(crypto.randomUUID());
    this.ultimaVenta.set(null);
    this.pantallaEstado.set('armando');
  }
}
