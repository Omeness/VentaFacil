from datetime import timedelta
import random

from django.core.management.base import BaseCommand
from django.utils import timezone

from ventas.models import DetalleVenta, MedioPago, Negocio, Producto, Usuario, Venta


class Command(BaseCommand):
    help = 'Carga datos de demostración para el negocio El Buen Sabor'

    def handle(self, *args, **options):
        if Negocio.objects.filter(nombre='El Buen Sabor').exists():
            self.stdout.write(self.style.WARNING('Los datos demo ya existen.'))
            return

        negocio = Negocio.objects.create(nombre='El Buen Sabor', activo=True)

        # Medios de pago
        mp_efectivo, _ = MedioPago.objects.get_or_create(codigo='efectivo', defaults={'nombre': 'Efectivo'})
        mp_transfer, _ = MedioPago.objects.get_or_create(codigo='transferencia', defaults={'nombre': 'Transferencia'})
        mp_debito, _ = MedioPago.objects.get_or_create(codigo='debito', defaults={'nombre': 'Débito'})
        mp_credito, _ = MedioPago.objects.get_or_create(codigo='credito', defaults={'nombre': 'Crédito'})
        medios = [mp_efectivo, mp_transfer, mp_debito, mp_credito]

        # Usuarios
        maria = Usuario(
            negocio=negocio,
            nombre='María Pérez',
            identificador_acceso='maria.perez',
            rol=Usuario.ROL_ADMINISTRADOR,
            activo=True,
        )
        maria.set_password('admin123')
        maria.set_pin('1234')
        maria.save()

        juan = Usuario(
            negocio=negocio,
            nombre='Juan Soto',
            identificador_acceso='juan.soto',
            rol=Usuario.ROL_VENDEDOR,
            activo=True,
        )
        juan.set_password('venta123')
        juan.save()

        camila = Usuario(
            negocio=negocio,
            nombre='Camila Rojas',
            identificador_acceso='camila.rojas',
            rol=Usuario.ROL_VENDEDOR,
            activo=True,
        )
        camila.set_password('venta123')
        camila.save()

        pedro = Usuario(
            negocio=negocio,
            nombre='Pedro Muñoz',
            identificador_acceso='pedro.munoz',
            rol=Usuario.ROL_VENDEDOR,
            activo=False,
            baja_en=timezone.now() - timedelta(days=23),
        )
        pedro.set_password('venta123')
        pedro.save()

        # Productos
        productos_def = [
            ('Completo italiano', 2500, 'Completos', True),
            ('Completo dinámico', 2800, 'Completos', True),
            ('As italiano', 4500, 'Completos', True),
            ('Churrasco italiano', 5500, 'Sándwiches', True),
            ('Barros Luco', 5500, 'Sándwiches', True),
            ('Bebida en lata', 1500, 'Bebidas', True),
            ('Jugo natural', 2000, 'Bebidas', True),
            ('Empanada de pino', 2500, 'Para picar', True),
            ('Papas fritas', 2000, 'Para picar', True),
            ('Sopaipilla', 500, '', False),
        ]
        prods = {}
        for nombre, precio, cat, activo in productos_def:
            prods[nombre] = Producto.objects.create(
                negocio=negocio,
                nombre=nombre,
                precio_vigente=precio,
                categoria=cat,
                activo=activo,
            )

        ahora = timezone.now()

        def crear_venta(vendedor, medio, items, minutos_atras, estado=Venta.ESTADO_VIGENTE, motivo=''):
            fecha = ahora - timedelta(minutes=minutos_atras)
            total = sum(prods[n].precio_vigente * c for n, c in items)
            v = Venta.objects.create(
                negocio=negocio,
                registrada_por=vendedor,
                medio_pago=medio,
                total=total,
                estado=estado,
                fecha_hora=fecha,
                motivo_solicitud=motivo,
                solicitada_en=fecha + timedelta(minutes=2) if estado != Venta.ESTADO_VIGENTE else None,
                anulada_por=maria if estado == Venta.ESTADO_ANULADA else None,
                anulada_en=fecha + timedelta(minutes=5) if estado == Venta.ESTADO_ANULADA else None,
            )
            for n, c in items:
                p = prods[n]
                DetalleVenta.objects.create(
                    venta=v,
                    producto=p,
                    nombre_producto=p.nombre,
                    precio_unitario=p.precio_vigente,
                    cantidad=c,
                )

        # Ventas de demo de hoy (incluye 2 por anular y 1 anulada)
        crear_venta(juan, mp_efectivo, [('Completo italiano', 2), ('As italiano', 1)], 15)
        crear_venta(maria, mp_debito, [('Churrasco italiano', 1)], 23)
        crear_venta(
            juan,
            mp_transfer,
            [('Completo italiano', 1)],
            30,
            estado=Venta.ESTADO_POR_ANULAR,
            motivo='Me equivoqué de medio de pago',
        )
        crear_venta(camila, mp_efectivo, [('Empanada de pino', 1), ('Bebida en lata', 1)], 40)
        crear_venta(
            camila,
            mp_debito,
            [('Churrasco italiano', 1)],
            55,
            estado=Venta.ESTADO_POR_ANULAR,
            motivo='',
        )
        crear_venta(juan, mp_efectivo, [('Bebida en lata', 2)], 75, estado=Venta.ESTADO_ANULADA)
        crear_venta(juan, mp_credito, [('Barros Luco', 1), ('Jugo natural', 1)], 95)

        combos = [
            [('Completo italiano', 2), ('Bebida en lata', 2)],
            [('Completo dinámico', 1), ('Papas fritas', 1)],
            [('As italiano', 1), ('Bebida en lata', 1)],
            [('Churrasco italiano', 1), ('Jugo natural', 1)],
            [('Empanada de pino', 2)],
            [('Completo italiano', 3), ('Bebida en lata', 2)],
            [('Barros Luco', 1), ('Papas fritas', 1)],
            [('Completo italiano', 1), ('Jugo natural', 1)],
            [('Papas fritas', 2), ('Bebida en lata', 2)],
            [('As italiano', 2)],
            [('Completo dinámico', 2), ('Bebida en lata', 1)],
            [('Churrasco italiano', 2), ('Bebida en lata', 2)],
            [('Empanada de pino', 3), ('Jugo natural', 1)],
        ]
        vendedores = [juan, camila, maria]
        random.seed(42)
        for idx, combo in enumerate(combos):
            crear_venta(
                vendedores[idx % len(vendedores)],
                medios[idx % len(medios)],
                combo,
                110 + idx * 18,
            )

        self.stdout.write(self.style.SUCCESS('Datos demo cargados correctamente para "El Buen Sabor".'))
