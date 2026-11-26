import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_URL } from './auth.service';
import { MedioPago, Producto, ResumenNegocio, UsuarioEquipo, Venta } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getMediosPago() {
    return this.http.get<MedioPago[]>(`${API_URL}/medios-pago/`);
  }

  getProductosMenuActivo() {
    return this.http.get<{ productos: Producto[]; mas_vendidos_ids: number[] }>(
      `${API_URL}/productos/?activos=1&con_mas_vendidos=1`
    );
  }

  getTodosProductos() {
    return this.http.get<Producto[]>(`${API_URL}/productos/`);
  }

  crearProducto(data: { nombre: string; precio_vigente: number; categoria: string }) {
    return this.http.post<Producto>(`${API_URL}/productos/`, data);
  }

  actualizarProducto(id: number, data: Partial<Producto>) {
    return this.http.patch<Producto>(`${API_URL}/productos/${id}/`, data);
  }

  registrarVenta(payload: {
    items: { producto_id: number; cantidad: number }[];
    medio_pago: string;
    id_cliente: string;
  }) {
    return this.http.post<Venta>(`${API_URL}/ventas/`, payload);
  }

  getMisVentas() {
    return this.http.get<{
      total_turno: number;
      cantidad_ventas: number;
      por_anular_count: number;
      ventas: Venta[];
    }>(`${API_URL}/ventas/mis-ventas/`);
  }

  solicitarAnulacion(ventaId: number, motivo: string) {
    return this.http.patch<Venta>(`${API_URL}/ventas/${ventaId}/solicitar-anulacion/`, { motivo });
  }

  getVentasPorAnular() {
    return this.http.get<Venta[]>(`${API_URL}/ventas/por-anular/`);
  }

  confirmarAnulacion(ventaId: number) {
    return this.http.patch<Venta>(`${API_URL}/ventas/${ventaId}/anular/`, {});
  }

  restituirVenta(ventaId: number) {
    return this.http.patch<Venta>(`${API_URL}/ventas/${ventaId}/restituir/`, {});
  }

  getHistorial(filtros: {
    desde?: string;
    hasta?: string;
    medio_pago?: string;
    vendedor?: string;
    estado?: string;
    limit?: number;
  }) {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<{ total_registros: number; ventas: Venta[] }>(
      `${API_URL}/ventas/historial/`,
      { params }
    );
  }

  getResumen(periodo: string, desde?: string, hasta?: string) {
    let params = new HttpParams().set('periodo', periodo);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ResumenNegocio>(`${API_URL}/resumen/`, { params });
  }

  exportarExcel(filtros: {
    desde?: string;
    hasta?: string;
    medio_pago?: string;
    vendedor?: string;
    estado?: string;
  }) {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get(`${API_URL}/ventas/exportar-excel/`, {
      params,
      responseType: 'blob',
    });
  }

  getUsuarios() {
    return this.http.get<UsuarioEquipo[]>(`${API_URL}/usuarios/`);
  }

  crearVendedor(data: { nombre: string; identificador_acceso: string; password: string }) {
    return this.http.post<UsuarioEquipo>(`${API_URL}/usuarios/`, data);
  }

  darDeBajaUsuario(id: number) {
    return this.http.patch<UsuarioEquipo>(`${API_URL}/usuarios/${id}/dar-de-baja/`, {});
  }
}
