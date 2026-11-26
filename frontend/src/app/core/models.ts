export interface UsuarioAuth {
  id: number;
  nombre: string;
  identificador_acceso: string;
  rol: 'administrador' | 'vendedor';
  negocio_nombre: string;
  tiene_pin: boolean;
}

export interface UsuarioEquipo {
  id: number;
  nombre: string;
  identificador_acceso: string;
  rol: 'administrador' | 'vendedor';
  activo: boolean;
  creado_en: string;
  baja_en: string | null;
  baja_fecha: string | null;
}

export interface Producto {
  id: number;
  nombre: string;
  precio_vigente: number;
  categoria: string;
  activo: boolean;
}

export interface MedioPago {
  id: number;
  codigo: string;
  nombre: string;
}

export interface DetalleVenta {
  id: number;
  producto_id: number;
  nombre_producto: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  numero: string;
  fecha_hora: string;
  fecha: string;
  hora: string;
  vendedor_nombre: string;
  registrada_por_id: number;
  medio_pago_id: number;
  medio_pago_codigo: string;
  medio_pago_nombre: string;
  total: number;
  estado: 'vigente' | 'por_anular' | 'anulada';
  id_cliente: string;
  motivo_solicitud: string;
  resumen_productos: string;
  detalles: DetalleVenta[];
}

export interface ResumenNegocio {
  periodo: string;
  desde: string;
  hasta: string;
  total_vendido: number;
  numero_ventas: number;
  ticket_promedio: number;
  anuladas_count: number;
  por_anular_count: number;
  por_medio_pago: { codigo: string; nombre: string; total: number }[];
  mas_vendidos: { nombre_producto: string; unidades: number }[];
  ultimas_ventas: Venta[];
}
