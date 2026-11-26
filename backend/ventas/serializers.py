from rest_framework import serializers

from .models import DetalleVenta, MedioPago, Producto, Usuario, Venta


class UsuarioSerializer(serializers.ModelSerializer):
    baja_fecha = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            'id',
            'nombre',
            'identificador_acceso',
            'rol',
            'activo',
            'creado_en',
            'baja_en',
            'baja_fecha',
        ]

    def get_baja_fecha(self, obj):
        if obj.baja_en:
            return obj.baja_en.strftime('%d-%m-%Y')
        return None


class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ['id', 'nombre', 'precio_vigente', 'categoria', 'activo']


class MedioPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedioPago
        fields = ['id', 'codigo', 'nombre']


class DetalleVentaSerializer(serializers.ModelSerializer):
    subtotal = serializers.IntegerField(read_only=True)

    class Meta:
        model = DetalleVenta
        fields = ['id', 'producto_id', 'nombre_producto', 'precio_unitario', 'cantidad', 'subtotal']


class VentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(many=True, read_only=True)
    vendedor_nombre = serializers.CharField(source='registrada_por.nombre', read_only=True)
    medio_pago_codigo = serializers.CharField(source='medio_pago.codigo', read_only=True)
    medio_pago_nombre = serializers.CharField(source='medio_pago.nombre', read_only=True)
    fecha = serializers.SerializerMethodField()
    hora = serializers.SerializerMethodField()
    numero = serializers.SerializerMethodField()
    resumen_productos = serializers.SerializerMethodField()

    class Meta:
        model = Venta
        fields = [
            'id',
            'numero',
            'fecha_hora',
            'fecha',
            'hora',
            'vendedor_nombre',
            'registrada_por_id',
            'medio_pago_id',
            'medio_pago_codigo',
            'medio_pago_nombre',
            'total',
            'estado',
            'id_cliente',
            'motivo_solicitud',
            'solicitada_en',
            'anulada_en',
            'restituida_en',
            'resumen_productos',
            'detalles',
        ]

    def get_fecha(self, obj):
        from django.utils import timezone
        local_dt = timezone.localtime(obj.fecha_hora)
        return local_dt.strftime('%d-%m-%Y')

    def get_hora(self, obj):
        from django.utils import timezone
        local_dt = timezone.localtime(obj.fecha_hora)
        return local_dt.strftime('%H:%M')

    def get_numero(self, obj):
        return f"#{obj.id:04d}"

    def get_resumen_productos(self, obj):
        return ', '.join(f"{d.cantidad} × {d.nombre_producto}" for d in obj.detalles.all())
