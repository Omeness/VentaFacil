import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ClpPipe } from '../core/clp.pipe';
import { Producto } from '../core/models';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [FormsModule, ClpPipe],
  template: `
    @if (editando()) {
      <!-- Pantalla 13: Editar / Agregar producto -->
      <div class="mb-4">
        <h3 class="fw-bold mb-1">{{ productoForm.id ? 'Editar producto' : 'Agregar producto' }}</h3>
        <p class="text-muted small mb-0">Solo nombre, precio y una categoría opcional.</p>
      </div>

      <div class="vf-card p-4" style="max-width: 640px;">
        <form (ngSubmit)="guardarProducto()">
          <div class="mb-3">
            <label class="form-label fw-medium small">Nombre</label>
            <input
              type="text"
              class="form-control form-control-lg rounded-3"
              [(ngModel)]="productoForm.nombre"
              name="nombre"
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label fw-medium small">Precio</label>
            <div class="input-group input-group-lg">
              <span class="input-group-text bg-white">$</span>
              <input
                type="number"
                class="form-control"
                [(ngModel)]="productoForm.precio_vigente"
                name="precio"
                min="1"
                step="1"
                required
              />
            </div>
            <div class="form-text">
              En pesos, sin decimales. Debe ser mayor a $0. Las ventas anteriores conservan su precio.
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label fw-medium small">Categoría (opcional)</label>
            <input
              type="text"
              class="form-control form-control-lg rounded-3"
              [(ngModel)]="productoForm.categoria"
              name="categoria"
            />
            <div class="form-text mb-2">
              Agrupa el producto en la pantalla de venta. Toca una que ya usas:
            </div>
            <div class="d-flex flex-wrap gap-2">
              @for (cat of categoriasExistentes(); track cat) {
                <button
                  type="button"
                  class="btn btn-sm btn-vf-outline rounded-pill px-3"
                  (click)="productoForm.categoria = cat"
                >
                  {{ cat }}
                </button>
              }
            </div>
          </div>

          @if (errorMsg()) {
            <div class="alert alert-danger py-2 px-3 small mb-3">{{ errorMsg() }}</div>
          }

          <div class="d-flex gap-2 pt-2">
            <button type="button" class="btn btn-vf-outline px-4" (click)="cancelarEdicion()">
              Cancelar
            </button>
            <button type="submit" class="btn btn-vf-primary px-4">
              Guardar
            </button>
          </div>
        </form>
      </div>
    } @else {
      <!-- Pantalla 12: Menú -->
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h3 class="fw-bold mb-1">Menú</h3>
          <p class="text-muted small mb-2">
            Lo que tu equipo ve al vender. Un producto inactivo no aparece en la venta, pero sigue en el historial.
          </p>
          <div class="text-muted small">
            <i class="bi bi-lock me-1"></i> Sección protegida con PIN: se cierra al salir.
          </div>
        </div>
        <button type="button" class="btn btn-vf-primary px-4" (click)="nuevoProducto()">
          Agregar producto
        </button>
      </div>

      <div class="vf-card overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr class="small text-muted">
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (p of productos(); track p.id) {
                <tr>
                  <td class="fw-medium">{{ p.nombre }}</td>
                  <td class="text-muted">{{ p.categoria || 'Sin categoría' }}</td>
                  <td class="fw-semibold">{{ p.precio_vigente | clp }}</td>
                  <td>
                    @if (p.activo) {
                      <span class="badge-vigente">Activo</span>
                    } @else {
                      <span class="badge-anulada">Inactivo</span>
                    }
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn btn-link text-vf-primary text-decoration-none p-0 small fw-medium"
                      (click)="editarProducto(p)"
                    >
                      Editar
                    </button>
                    <span class="text-muted mx-1">·</span>
                    <button
                      type="button"
                      class="btn btn-link text-vf-primary text-decoration-none p-0 small fw-medium"
                      (click)="toggleActivo(p)"
                    >
                      {{ p.activo ? 'Desactivar' : 'Activar' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class MenuComponent implements OnInit {
  productos = signal<Producto[]>([]);
  editando = signal(false);
  errorMsg = signal('');

  productoForm: { id: number | null; nombre: string; precio_vigente: number | null; categoria: string } = {
    id: null,
    nombre: '',
    precio_vigente: null,
    categoria: '',
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.getTodosProductos().subscribe((list) => this.productos.set(list));
  }

  categoriasExistentes = computed(() => {
    const set = new Set<string>();
    for (const p of this.productos()) {
      if (p.categoria) set.add(p.categoria);
    }
    return Array.from(set);
  });

  nuevoProducto() {
    this.errorMsg.set('');
    this.productoForm = { id: null, nombre: '', precio_vigente: null, categoria: '' };
    this.editando.set(true);
  }

  editarProducto(p: Producto) {
    this.errorMsg.set('');
    this.productoForm = {
      id: p.id,
      nombre: p.nombre,
      precio_vigente: p.precio_vigente,
      categoria: p.categoria,
    };
    this.editando.set(true);
  }

  cancelarEdicion() {
    this.editando.set(false);
  }

  guardarProducto() {
    this.errorMsg.set('');
    const precio = Number(this.productoForm.precio_vigente);
    if (!this.productoForm.nombre.trim()) {
      this.errorMsg.set('El nombre es obligatorio.');
      return;
    }
    if (!Number.isInteger(precio) || precio <= 0) {
      this.errorMsg.set('El precio debe ser un número entero mayor a $0.');
      return;
    }

    const payload = {
      nombre: this.productoForm.nombre.trim(),
      precio_vigente: precio,
      categoria: this.productoForm.categoria.trim(),
    };

    const req = this.productoForm.id
      ? this.api.actualizarProducto(this.productoForm.id, payload)
      : this.api.crearProducto(payload);

    req.subscribe({
      next: () => {
        this.editando.set(false);
        this.cargar();
      },
      error: (err) => this.errorMsg.set(err?.error?.detail || 'No se pudo guardar el producto.'),
    });
  }

  toggleActivo(p: Producto) {
    this.api.actualizarProducto(p.id, { activo: !p.activo }).subscribe({
      next: () => this.cargar(),
    });
  }
}
