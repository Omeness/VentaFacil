import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { UsuarioEquipo } from '../core/models';

@Component({
  selector: 'app-equipo',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (agregando()) {
      <!-- Pantalla 15: Agregar vendedor -->
      <div class="mb-4">
        <h3 class="fw-bold mb-1">Agregar vendedor</h3>
        <p class="text-muted small mb-0">Solo lo necesario para que pueda vender.</p>
      </div>

      <div class="vf-card p-4" style="max-width: 640px;">
        <form (ngSubmit)="crearVendedor()">
          <div class="mb-3">
            <label class="form-label fw-medium small">Nombre</label>
            <input
              type="text"
              class="form-control form-control-lg rounded-3"
              placeholder="Ej: Camila Rojas"
              [(ngModel)]="form.nombre"
              name="nombre"
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label fw-medium small">Identificador de acceso</label>
            <input
              type="text"
              class="form-control form-control-lg rounded-3"
              placeholder="Ej: camila.rojas"
              [(ngModel)]="form.identificador_acceso"
              name="identificador"
              required
            />
            <div class="form-text">Con esto entrará a la app. No puede repetirse en tu local.</div>
          </div>

          <div class="mb-3">
            <label class="form-label fw-medium small">Contraseña inicial</label>
            <input
              type="password"
              class="form-control form-control-lg rounded-3"
              [(ngModel)]="form.password"
              name="password"
              required
            />
            <div class="form-text">Entrégasela en persona. No pedimos correo ni teléfono.</div>
          </div>

          @if (errorMsg()) {
            <div class="alert alert-danger py-2 px-3 small mb-3">{{ errorMsg() }}</div>
          }

          <div class="d-flex gap-2 pt-2">
            <button type="button" class="btn btn-vf-outline px-4" (click)="agregando.set(false)">
              Cancelar
            </button>
            <button type="submit" class="btn btn-vf-primary px-4">
              Crear vendedor
            </button>
          </div>
        </form>
      </div>
    } @else {
      <!-- Pantalla 14: Equipo -->
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h3 class="fw-bold mb-1">Equipo</h3>
          <p class="text-muted small mb-2">
            Quienes pueden vender en tu local. Dar de baja quita el acceso, pero sus ventas se conservan.
          </p>
          <div class="text-muted small">
            <i class="bi bi-lock me-1"></i> Sección protegida con PIN: se cierra al salir.
          </div>
        </div>
        <button type="button" class="btn btn-vf-primary px-4" (click)="abrirAgregar()">
          Agregar vendedor
        </button>
      </div>

      <div class="vf-card overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr class="small text-muted">
                <th>Nombre</th>
                <th>Identificador de acceso</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (u of usuarios(); track u.id) {
                <tr>
                  <td class="fw-medium">{{ u.nombre }}</td>
                  <td class="text-muted">{{ u.identificador_acceso }}</td>
                  <td>{{ u.rol === 'administrador' ? 'Administrador/a' : 'Vendedor/a' }}</td>
                  <td>
                    @if (u.activo) {
                      <span class="badge-vigente">Activo</span>
                    } @else {
                      <span class="badge-anulada">Dado de baja</span>
                    }
                  </td>
                  <td>
                    @if (u.id === auth.usuario()?.id) {
                      <span class="text-muted small">Tú</span>
                    } @else if (u.activo) {
                      <button
                        type="button"
                        class="btn btn-link text-vf-primary text-decoration-none p-0 small fw-medium"
                        (click)="usuarioABajar.set(u)"
                      >
                        Dar de baja
                      </button>
                    } @else {
                      <span class="text-muted small">Sin acceso desde {{ u.baja_fecha }}</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    @if (usuarioABajar()) {
      <div class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3">
        <div class="bg-white rounded-4 p-4 shadow-lg w-100" style="max-width: 400px;">
          <h5 class="fw-bold mb-2">¿Dar de baja a {{ usuarioABajar()!.nombre }}?</h5>
          <p class="text-muted small mb-4">
            Perderá el acceso a la aplicación de inmediato. Sus ventas anteriores seguirán visibles en el historial.
          </p>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-vf-outline flex-fill" (click)="usuarioABajar.set(null)">
              Cancelar
            </button>
            <button type="button" class="btn btn-danger flex-fill fw-semibold" (click)="confirmarBaja()">
              Dar de baja
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
export class EquipoComponent implements OnInit {
  usuarios = signal<UsuarioEquipo[]>([]);
  agregando = signal(false);
  usuarioABajar = signal<UsuarioEquipo | null>(null);
  errorMsg = signal('');

  form = {
    nombre: '',
    identificador_acceso: '',
    password: '',
  };

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.getUsuarios().subscribe((list) => this.usuarios.set(list));
  }

  abrirAgregar() {
    this.errorMsg.set('');
    this.form = { nombre: '', identificador_acceso: '', password: '' };
    this.agregando.set(true);
  }

  crearVendedor() {
    this.errorMsg.set('');
    this.api.crearVendedor(this.form).subscribe({
      next: () => {
        this.agregando.set(false);
        this.cargar();
      },
      error: (err) => this.errorMsg.set(err?.error?.detail || 'No se pudo crear el vendedor.'),
    });
  }

  confirmarBaja() {
    const u = this.usuarioABajar();
    if (!u) return;
    this.api.darDeBajaUsuario(u.id).subscribe({
      next: () => {
        this.usuarioABajar.set(null);
        this.cargar();
      },
    });
  }
}
