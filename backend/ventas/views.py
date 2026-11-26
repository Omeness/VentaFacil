import io
import secrets
import uuid
from datetime import datetime, timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count, Sum
from django.http import HttpResponse
from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Font
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    DetalleVenta,
    MedioPago,
    Producto,
    RegistroAuditoria,
    SesionToken,
    Usuario,
    Venta,
)
from .permissions import EsAdministrador, EsAutenticado
from .serializers import MedioPagoSerializer, ProductoSerializer, UsuarioSerializer, VentaSerializer


def registrar_auditoria(negocio, usuario, accion, entidad, entidad_id=None, detalle=''):
    RegistroAuditoria.objects.create(
        negocio=negocio,
        usuario=usuario,
        accion=accion,
        entidad=entidad,
        entidad_id=entidad_id,
        detalle=detalle,
    )


def sanitizar_celda_excel(valor):
    """Previene inyección de fórmulas en Excel (OWASP A03)."""
    if isinstance(valor, str) and valor and valor[0] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + valor
    return valor


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identificador = (request.data.get('identificador') or '').strip().lower()
        password = request.data.get('password') or ''

        mensaje_generico = 'Identificador o contraseña incorrectos.'

        if not identificador or not password:
            return Response({'detail': mensaje_generico}, status=status.HTTP_401_UNAUTHORIZED)

        usuario = (
            Usuario.objects.select_related('negocio')
            .filter(identificador_acceso__iexact=identificador)
            .first()
        )

        if not usuario or not usuario.activo or not usuario.negocio.activo:
            return Response({'detail': mensaje_generico}, status=status.HTTP_401_UNAUTHORIZED)

        if usuario.esta_bloqueado():
            return Response(
                {'detail': 'Cuenta bloqueada temporalmente por intentos fallidos. Intenta en unos minutos.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if not usuario.check_password(password):
            usuario.intentos_fallidos += 1
            if usuario.intentos_fallidos >= 5:
                usuario.bloqueado_hasta = timezone.now() + timedelta(minutes=5)
                usuario.intentos_fallidos = 0
                usuario.save(update_fields=['intentos_fallidos', 'bloqueado_hasta'])
                registrar_auditoria(
                    usuario.negocio,
                    usuario,
                    'LOGIN_BLOQUEADO',
                    'usuario',
                    usuario.id,
                    'Bloqueo temporal tras 5 intentos fallidos',
                )
                return Response(
                    {'detail': 'Cuenta bloqueada temporalmente por intentos fallidos. Intenta en unos minutos.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            usuario.save(update_fields=['intentos_fallidos'])
            registrar_auditoria(
                usuario.negocio, usuario, 'LOGIN_FALLIDO', 'usuario', usuario.id, 'Contraseña incorrecta'
            )
            return Response({'detail': mensaje_generico}, status=status.HTTP_401_UNAUTHORIZED)

        usuario.intentos_fallidos = 0
        usuario.bloqueado_hasta = None
        usuario.save(update_fields=['intentos_fallidos', 'bloqueado_hasta'])

        token_str = secrets.token_urlsafe(32)
        SesionToken.objects.create(token=token_str, usuario=usuario)
        registrar_auditoria(usuario.negocio, usuario, 'LOGIN_OK', 'usuario', usuario.id)

        return Response(
            {
                'token': token_str,
                'usuario': {
                    'id': usuario.id,
                    'nombre': usuario.nombre,
                    'identificador_acceso': usuario.identificador_acceso,
                    'rol': usuario.rol,
                    'negocio_nombre': usuario.negocio.nombre,
                    'tiene_pin': bool(usuario.pin_hash),
                },
            }
        )


class LogoutView(APIView):
    permission_classes = [EsAutenticado]

    def post(self, request):
        if request.auth:
            request.auth.delete()
        return Response({'detail': 'Sesión cerrada.'})


class VerifyPinView(APIView):
    permission_classes = [EsAdministrador]

    def post(self, request):
        pin = str(request.data.get('pin') or '').strip()
        usuario = request.user

        if usuario.pin_esta_bloqueado():
            return Response(
                {'detail': 'PIN bloqueado temporalmente por intentos fallidos. Intenta en unos minutos.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if not pin or len(pin) != 4 or not pin.isdigit() or not usuario.check_pin(pin):
            usuario.pin_intentos_fallidos += 1
            if usuario.pin_intentos_fallidos >= 5:
                usuario.pin_bloqueado_hasta = timezone.now() + timedelta(minutes=5)
                usuario.pin_intentos_fallidos = 0
                usuario.save(update_fields=['pin_intentos_fallidos', 'pin_bloqueado_hasta'])
                return Response(
                    {'detail': 'PIN bloqueado temporalmente por intentos fallidos.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            usuario.save(update_fields=['pin_intentos_fallidos'])
            return Response({'detail': 'PIN incorrecto.'}, status=status.HTTP_401_UNAUTHORIZED)

        usuario.pin_intentos_fallidos = 0
        usuario.pin_bloqueado_hasta = None
        usuario.save(update_fields=['pin_intentos_fallidos', 'pin_bloqueado_hasta'])
        return Response({'verified': True})


class MedioPagoListView(APIView):
    permission_classes = [EsAutenticado]

    def get(self, request):
        medios = MedioPago.objects.all().order_by('id')
        return Response(MedioPagoSerializer(medios, many=True).data)


class ProductoListCreateView(APIView):
    permission_classes = [EsAutenticado]

    def get(self, request):
        solo_activos = request.query_params.get('activos') == '1'
        qs = Producto.objects.filter(negocio=request.user.negocio)
        if solo_activos:
            qs = qs.filter(activo=True)
        qs = qs.order_by('categoria', 'nombre')

        productos_data = ProductoSerializer(qs, many=True).data

        if request.query_params.get('con_mas_vendidos') == '1':
            top_ids = list(
                DetalleVenta.objects.filter(
                    venta__negocio=request.user.negocio,
                    venta__estado__in=[Venta.ESTADO_VIGENTE, Venta.ESTADO_POR_ANULAR],
                    producto__activo=True,
                )
                .values('producto_id')
                .annotate(total_u=Sum('cantidad'))
                .order_by('-total_u')[:4]
                .values_list('producto_id', flat=True)
            )
            return Response({'productos': productos_data, 'mas_vendidos_ids': top_ids})

        return Response(productos_data)

    def post(self, request):
        if request.user.rol != Usuario.ROL_ADMINISTRADOR:
            return Response({'detail': 'No tienes permisos.'}, status=status.HTTP_403_FORBIDDEN)

        nombre = (request.data.get('nombre') or '').strip()
        categoria = (request.data.get('categoria') or '').strip()
        try:
            precio = int(request.data.get('precio_vigente', 0))
        except (TypeError, ValueError):
            precio = 0

        if not nombre:
            return Response({'detail': 'El nombre es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        if precio <= 0:
            return Response(
                {'detail': 'El precio debe ser un número entero mayor a $0.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        producto = Producto.objects.create(
            negocio=request.user.negocio,
            nombre=nombre,
            precio_vigente=precio,
            categoria=categoria,
            activo=True,
        )
        registrar_auditoria(
            request.user.negocio, request.user, 'CREAR_PRODUCTO', 'producto', producto.id, nombre
        )
        return Response(ProductoSerializer(producto).data, status=status.HTTP_201_CREATED)


class ProductoDetailView(APIView):
    permission_classes = [EsAdministrador]

    def patch(self, request, pk):
        producto = Producto.objects.filter(id=pk, negocio=request.user.negocio).first()
        if not producto:
            return Response({'detail': 'Producto no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if 'nombre' in request.data:
            nombre = (request.data.get('nombre') or '').strip()
            if not nombre:
                return Response({'detail': 'El nombre es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
            producto.nombre = nombre

        if 'precio_vigente' in request.data:
            try:
                precio = int(request.data.get('precio_vigente'))
            except (TypeError, ValueError):
                precio = 0
            if precio <= 0:
                return Response(
                    {'detail': 'El precio debe ser un número entero mayor a $0.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            producto.precio_vigente = precio

        if 'categoria' in request.data:
            producto.categoria = (request.data.get('categoria') or '').strip()

        if 'activo' in request.data:
            producto.activo = bool(request.data.get('activo'))

        producto.save()
        registrar_auditoria(
            request.user.negocio, request.user, 'ACTUALIZAR_PRODUCTO', 'producto', producto.id, producto.nombre
        )
        return Response(ProductoSerializer(producto).data)


class VentaCreateView(APIView):
    permission_classes = [EsAutenticado]

    def post(self, request):
        items = request.data.get('items') or []
        medio_pago_codigo = (request.data.get('medio_pago') or '').strip()
        id_cliente_raw = request.data.get('id_cliente')

        if not items:
            return Response(
                {'detail': 'Debes agregar al menos un producto.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        medio_pago = MedioPago.objects.filter(codigo=medio_pago_codigo).first()
        if not medio_pago:
            return Response(
                {'detail': 'Debes seleccionar un medio de pago válido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            id_cliente = uuid.UUID(str(id_cliente_raw)) if id_cliente_raw else uuid.uuid4()
        except ValueError:
            id_cliente = uuid.uuid4()

        existente = (
            Venta.objects.prefetch_related('detalles')
            .select_related('registrada_por', 'medio_pago')
            .filter(negocio=request.user.negocio, id_cliente=id_cliente)
            .first()
        )
        if existente:
            return Response(VentaSerializer(existente).data, status=status.HTTP_200_OK)

        with transaction.atomic():
            total = 0
            detalles_a_crear = []
            for item in items:
                prod_id = item.get('producto_id')
                try:
                    cantidad = int(item.get('cantidad', 0))
                except (TypeError, ValueError):
                    cantidad = 0
                if cantidad <= 0:
                    return Response(
                        {'detail': 'Las cantidades deben ser mayores a 0.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                producto = Producto.objects.filter(
                    id=prod_id, negocio=request.user.negocio, activo=True
                ).first()
                if not producto:
                    return Response(
                        {'detail': 'Uno de los productos no está disponible.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                total += producto.precio_vigente * cantidad
                detalles_a_crear.append(
                    DetalleVenta(
                        producto=producto,
                        nombre_producto=producto.nombre,
                        precio_unitario=producto.precio_vigente,
                        cantidad=cantidad,
                    )
                )

            venta = Venta.objects.create(
                negocio=request.user.negocio,
                registrada_por=request.user,
                medio_pago=medio_pago,
                total=total,
                estado=Venta.ESTADO_VIGENTE,
                fecha_hora=timezone.now(),
                id_cliente=id_cliente,
            )
            for d in detalles_a_crear:
                d.venta = venta
            DetalleVenta.objects.bulk_create(detalles_a_crear)

            registrar_auditoria(
                request.user.negocio,
                request.user,
                'REGISTRAR_VENTA',
                'venta',
                venta.id,
                f"Total ${total} ({medio_pago.nombre})",
            )

        venta_completa = (
            Venta.objects.prefetch_related('detalles')
            .select_related('registrada_por', 'medio_pago')
            .get(id=venta.id)
        )
        return Response(VentaSerializer(venta_completa).data, status=status.HTTP_201_CREATED)


class MisVentasView(APIView):
    permission_classes = [EsAutenticado]

    def get(self, request):
        hoy = timezone.localdate()
        inicio_dia = timezone.make_aware(datetime.combine(hoy, datetime.min.time()))
        fin_dia = inicio_dia + timedelta(days=1)

        ventas = (
            Venta.objects.prefetch_related('detalles')
            .select_related('registrada_por', 'medio_pago')
            .filter(
                negocio=request.user.negocio,
                registrada_por=request.user,
                fecha_hora__gte=inicio_dia,
                fecha_hora__lt=fin_dia,
            )
            .order_by('-fecha_hora', '-id')
        )

        activas = ventas.filter(estado__in=[Venta.ESTADO_VIGENTE, Venta.ESTADO_POR_ANULAR])
        total_turno = activas.aggregate(s=Sum('total'))['s'] or 0
        cantidad_ventas = activas.count()
        por_anular_count = ventas.filter(estado=Venta.ESTADO_POR_ANULAR).count()

        return Response(
            {
                'total_turno': total_turno,
                'cantidad_ventas': cantidad_ventas,
                'por_anular_count': por_anular_count,
                'ventas': VentaSerializer(ventas, many=True).data,
            }
        )


class SolicitarAnulacionView(APIView):
    permission_classes = [EsAutenticado]

    def patch(self, request, pk):
        venta = Venta.objects.filter(id=pk, negocio=request.user.negocio).first()
        if not venta:
            return Response({'detail': 'Venta no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        if venta.registrada_por_id != request.user.id:
            return Response(
                {'detail': 'Solo puedes solicitar anulación de tus propias ventas.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if venta.estado != Venta.ESTADO_VIGENTE:
            return Response(
                {'detail': 'Solo las ventas vigentes pueden marcarse por anular.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        motivo = (request.data.get('motivo') or '').strip()
        venta.estado = Venta.ESTADO_POR_ANULAR
        venta.motivo_solicitud = motivo
        venta.solicitada_en = timezone.now()
        venta.save(update_fields=['estado', 'motivo_solicitud', 'solicitada_en'])

        registrar_auditoria(
            request.user.negocio,
            request.user,
            'SOLICITAR_ANULACION',
            'venta',
            venta.id,
            motivo or 'Sin motivo',
        )
        return Response(VentaSerializer(venta).data)


class VentasPorAnularView(APIView):
    permission_classes = [EsAdministrador]

    def get(self, request):
        ventas = (
            Venta.objects.prefetch_related('detalles')
            .select_related('registrada_por', 'medio_pago')
            .filter(negocio=request.user.negocio, estado=Venta.ESTADO_POR_ANULAR)
            .order_by('-solicitada_en', '-id')
        )
        return Response(VentaSerializer(ventas, many=True).data)


class ConfirmarAnulacionView(APIView):
    permission_classes = [EsAdministrador]

    def patch(self, request, pk):
        venta = Venta.objects.filter(id=pk, negocio=request.user.negocio).first()
        if not venta:
            return Response({'detail': 'Venta no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        if venta.estado != Venta.ESTADO_POR_ANULAR:
            return Response(
                {'detail': 'Solo se pueden anular ventas marcadas como por anular.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        venta.estado = Venta.ESTADO_ANULADA
        venta.anulada_por = request.user
        venta.anulada_en = timezone.now()
        venta.save(update_fields=['estado', 'anulada_por', 'anulada_en'])

        registrar_auditoria(
            request.user.negocio, request.user, 'CONFIRMAR_ANULACION', 'venta', venta.id
        )
        return Response(VentaSerializer(venta).data)


class RestituirVentaView(APIView):
    permission_classes = [EsAdministrador]

    def patch(self, request, pk):
        venta = Venta.objects.filter(id=pk, negocio=request.user.negocio).first()
        if not venta:
            return Response({'detail': 'Venta no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        if venta.estado != Venta.ESTADO_POR_ANULAR:
            return Response(
                {'detail': 'Solo se pueden restituir ventas marcadas como por anular.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        venta.estado = Venta.ESTADO_VIGENTE
        venta.restituida_por = request.user
        venta.restituida_en = timezone.now()
        venta.save(update_fields=['estado', 'restituida_por', 'restituida_en'])

        registrar_auditoria(
            request.user.negocio, request.user, 'RECHAZAR_ANULACION', 'venta', venta.id
        )
        return Response(VentaSerializer(venta).data)


def filtrar_ventas_rango(request):
    desde_str = request.query_params.get('desde')
    hasta_str = request.query_params.get('hasta')
    medio_pago = request.query_params.get('medio_pago')
    vendedor = request.query_params.get('vendedor')
    estado = request.query_params.get('estado')

    qs = (
        Venta.objects.prefetch_related('detalles')
        .select_related('registrada_por', 'medio_pago')
        .filter(negocio=request.user.negocio)
    )

    if desde_str and hasta_str:
        try:
            d_desde = datetime.strptime(desde_str, '%Y-%m-%d').date()
            d_hasta = datetime.strptime(hasta_str, '%Y-%m-%d').date()
        except ValueError:
            return None, 'Formato de fecha inválido (YYYY-MM-DD).'
        if d_hasta < d_desde:
            return None, 'La fecha de término no puede ser anterior a la de inicio.'
        inicio = timezone.make_aware(datetime.combine(d_desde, datetime.min.time()))
        fin = timezone.make_aware(datetime.combine(d_hasta + timedelta(days=1), datetime.min.time()))
        qs = qs.filter(fecha_hora__gte=inicio, fecha_hora__lt=fin)
    elif desde_str:
        try:
            d_desde = datetime.strptime(desde_str, '%Y-%m-%d').date()
            inicio = timezone.make_aware(datetime.combine(d_desde, datetime.min.time()))
            qs = qs.filter(fecha_hora__gte=inicio)
        except ValueError:
            return None, 'Formato de fecha inválido.'
    elif hasta_str:
        try:
            d_hasta = datetime.strptime(hasta_str, '%Y-%m-%d').date()
            fin = timezone.make_aware(datetime.combine(d_hasta + timedelta(days=1), datetime.min.time()))
            qs = qs.filter(fecha_hora__lt=fin)
        except ValueError:
            return None, 'Formato de fecha inválido.'

    if medio_pago and medio_pago != 'todos':
        qs = qs.filter(medio_pago__codigo=medio_pago)
    if vendedor and vendedor != 'todos':
        qs = qs.filter(registrada_por_id=vendedor)
    if estado and estado != 'todos':
        qs = qs.filter(estado=estado)

    return qs.order_by('-fecha_hora', '-id'), None


class HistorialVentasView(APIView):
    permission_classes = [EsAdministrador]

    def get(self, request):
        qs, error = filtrar_ventas_rango(request)
        if error:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        total_registros = qs.count()
        limit = int(request.query_params.get('limit', 50))
        ventas_page = qs[:limit]
        return Response(
            {
                'total_registros': total_registros,
                'ventas': VentaSerializer(ventas_page, many=True).data,
            }
        )


class ResumenView(APIView):
    permission_classes = [EsAdministrador]

    def get(self, request):
        periodo = request.query_params.get('periodo', 'hoy')
        hoy = timezone.localdate()

        if periodo == 'hoy':
            d_desde = hoy
            d_hasta = hoy
        elif periodo == 'semana':
            d_desde = hoy - timedelta(days=hoy.weekday())
            d_hasta = hoy
        elif periodo == 'mes':
            d_desde = hoy.replace(day=1)
            d_hasta = hoy
        elif periodo == 'rango':
            try:
                d_desde = datetime.strptime(request.query_params.get('desde', ''), '%Y-%m-%d').date()
                d_hasta = datetime.strptime(request.query_params.get('hasta', ''), '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'detail': 'Debes indicar fechas válidas para el rango.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if d_hasta < d_desde:
                return Response(
                    {'detail': 'La fecha de término no puede ser anterior a la de inicio.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            d_desde = hoy
            d_hasta = hoy

        inicio = timezone.make_aware(datetime.combine(d_desde, datetime.min.time()))
        fin = timezone.make_aware(datetime.combine(d_hasta + timedelta(days=1), datetime.min.time()))

        ventas_periodo = Venta.objects.filter(
            negocio=request.user.negocio,
            fecha_hora__gte=inicio,
            fecha_hora__lt=fin,
        )

        ventas_activas = ventas_periodo.filter(
            estado__in=[Venta.ESTADO_VIGENTE, Venta.ESTADO_POR_ANULAR]
        )
        anuladas_count = ventas_periodo.filter(estado=Venta.ESTADO_ANULADA).count()
        por_anular_count = Venta.objects.filter(
            negocio=request.user.negocio, estado=Venta.ESTADO_POR_ANULAR
        ).count()

        agg = ventas_activas.aggregate(total=Sum('total'), count=Count('id'))
        total_vendido = agg['total'] or 0
        numero_ventas = agg['count'] or 0
        ticket_promedio = round(total_vendido / numero_ventas) if numero_ventas > 0 else 0

        medios = MedioPago.objects.all().order_by('id')
        totales_mp_map = {
            row['medio_pago__codigo']: row['total'] or 0
            for row in ventas_activas.values('medio_pago__codigo').annotate(total=Sum('total'))
        }
        por_medio_pago = [
            {
                'codigo': m.codigo,
                'nombre': m.nombre,
                'total': totales_mp_map.get(m.codigo, 0),
            }
            for m in medios
        ]

        mas_vendidos = list(
            DetalleVenta.objects.filter(venta__in=ventas_activas)
            .values('nombre_producto')
            .annotate(unidades=Sum('cantidad'))
            .order_by('-unidades', 'nombre_producto')[:5]
        )

        ultimas_ventas = (
            Venta.objects.prefetch_related('detalles')
            .select_related('registrada_por', 'medio_pago')
            .filter(negocio=request.user.negocio)
            .order_by('-fecha_hora', '-id')[:5]
        )

        return Response(
            {
                'periodo': periodo,
                'desde': d_desde.strftime('%d-%m-%Y'),
                'hasta': d_hasta.strftime('%d-%m-%Y'),
                'total_vendido': total_vendido,
                'numero_ventas': numero_ventas,
                'ticket_promedio': ticket_promedio,
                'anuladas_count': anuladas_count,
                'por_anular_count': por_anular_count,
                'por_medio_pago': por_medio_pago,
                'mas_vendidos': mas_vendidos,
                'ultimas_ventas': VentaSerializer(ultimas_ventas, many=True).data,
            }
        )


class ExportarExcelView(APIView):
    permission_classes = [EsAdministrador]

    def get(self, request):
        qs, error = filtrar_ventas_rango(request)
        if error:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        if not qs.exists():
            return Response(
                {'detail': 'No hay ventas en el período seleccionado para exportar.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wb = Workbook()
        ws = wb.active
        ws.title = 'Ventas'

        ws.append(['Este registro no reemplaza la boleta ni la contabilidad'])
        ws['A1'].font = Font(italic=True)
        ws.append([])

        headers = [
            'N° Venta',
            'Fecha',
            'Hora',
            'Vendedor',
            'Producto',
            'Cantidad',
            'Precio Unitario',
            'Subtotal',
            'Total Venta',
            'Medio de Pago',
            'Estado',
        ]
        ws.append(headers)
        for col_idx in range(1, len(headers) + 1):
            ws.cell(row=3, column=col_idx).font = Font(bold=True)

        estado_labels = {
            Venta.ESTADO_VIGENTE: 'Vigente',
            Venta.ESTADO_POR_ANULAR: 'Por anular',
            Venta.ESTADO_ANULADA: 'Anulada',
        }

        for venta in qs:
            local_dt = timezone.localtime(venta.fecha_hora)
            fecha_val = local_dt.date()
            hora_val = local_dt.strftime('%H:%M')
            for det in venta.detalles.all():
                ws.append(
                    [
                        f"#{venta.id:04d}",
                        fecha_val,
                        hora_val,
                        sanitizar_celda_excel(venta.registrada_por.nombre),
                        sanitizar_celda_excel(det.nombre_producto),
                        int(det.cantidad),
                        int(det.precio_unitario),
                        int(det.subtotal),
                        int(venta.total),
                        sanitizar_celda_excel(venta.medio_pago.nombre),
                        estado_labels.get(venta.estado, venta.estado),
                    ]
                )
                row_num = ws.max_row
                ws.cell(row=row_num, column=2).number_format = 'dd-mm-yyyy'
                for c in (7, 8, 9):
                    ws.cell(row=row_num, column=c).number_format = '#,##0'

        registrar_auditoria(
            request.user.negocio,
            request.user,
            'EXPORTAR_EXCEL',
            'venta',
            None,
            f"Exportación {request.query_params.dict()}",
        )

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="ventas_export.xlsx"'
        return response


class UsuarioListCreateView(APIView):
    permission_classes = [EsAdministrador]

    def get(self, request):
        usuarios = Usuario.objects.filter(negocio=request.user.negocio).order_by('-activo', 'id')
        return Response(UsuarioSerializer(usuarios, many=True).data)

    def post(self, request):
        nombre = (request.data.get('nombre') or '').strip()
        identificador = (request.data.get('identificador_acceso') or '').strip().lower()
        password = request.data.get('password') or ''

        if not nombre or not identificador or not password:
            return Response(
                {'detail': 'Nombre, identificador de acceso y contraseña inicial son obligatorios.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 6:
            return Response(
                {'detail': 'La contraseña debe tener al menos 6 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Usuario.objects.filter(
            negocio=request.user.negocio, identificador_acceso__iexact=identificador
        ).exists():
            return Response(
                {'detail': 'Ya existe un usuario con ese identificador de acceso.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            usuario = Usuario(
                negocio=request.user.negocio,
                nombre=nombre,
                identificador_acceso=identificador,
                rol=Usuario.ROL_VENDEDOR,
                activo=True,
            )
            usuario.set_password(password)
            usuario.save()
        except IntegrityError:
            return Response(
                {'detail': 'Ya existe un usuario con ese identificador de acceso.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        registrar_auditoria(
            request.user.negocio, request.user, 'CREAR_VENDEDOR', 'usuario', usuario.id, nombre
        )
        return Response(UsuarioSerializer(usuario).data, status=status.HTTP_201_CREATED)


class DarDeBajaUsuarioView(APIView):
    permission_classes = [EsAdministrador]

    def patch(self, request, pk):
        usuario = Usuario.objects.filter(id=pk, negocio=request.user.negocio).first()
        if not usuario:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if usuario.id == request.user.id:
            return Response(
                {'detail': 'No puedes darte de baja a ti mismo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario.activo = False
        usuario.baja_en = timezone.now()
        usuario.save(update_fields=['activo', 'baja_en'])
        SesionToken.objects.filter(usuario=usuario).delete()

        registrar_auditoria(
            request.user.negocio, request.user, 'BAJA_VENDEDOR', 'usuario', usuario.id, usuario.nombre
        )
        return Response(UsuarioSerializer(usuario).data)
