import uuid
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone


class Negocio(models.Model):
    nombre = models.CharField(max_length=120)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'negocio'

    def __str__(self):
        return self.nombre


class Usuario(models.Model):
    ROL_ADMINISTRADOR = 'administrador'
    ROL_VENDEDOR = 'vendedor'
    ROLES = [
        (ROL_ADMINISTRADOR, 'Administrador'),
        (ROL_VENDEDOR, 'Vendedor'),
    ]

    negocio = models.ForeignKey(Negocio, on_delete=models.PROTECT, related_name='usuarios')
    nombre = models.CharField(max_length=120)
    identificador_acceso = models.CharField(max_length=80)
    contrasena_hash = models.CharField(max_length=255)
    rol = models.CharField(max_length=20, choices=ROLES, default=ROL_VENDEDOR)
    activo = models.BooleanField(default=True)
    intentos_fallidos = models.PositiveIntegerField(default=0)
    bloqueado_hasta = models.DateTimeField(null=True, blank=True)
    pin_hash = models.CharField(max_length=255, null=True, blank=True)
    pin_intentos_fallidos = models.PositiveIntegerField(default=0)
    pin_bloqueado_hasta = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    baja_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'usuario'
        constraints = [
            models.UniqueConstraint(
                fields=['negocio', 'identificador_acceso'],
                name='uq_usuario_negocio_identificador',
            )
        ]

    @property
    def is_authenticated(self):
        return True

    def set_password(self, raw_password: str):
        self.contrasena_hash = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password(raw_password, self.contrasena_hash)

    def set_pin(self, raw_pin: str):
        self.pin_hash = make_password(raw_pin)

    def check_pin(self, raw_pin: str) -> bool:
        if not self.pin_hash:
            return False
        return check_password(raw_pin, self.pin_hash)

    def esta_bloqueado(self) -> bool:
        return bool(self.bloqueado_hasta and self.bloqueado_hasta > timezone.now())

    def pin_esta_bloqueado(self) -> bool:
        return bool(self.pin_bloqueado_hasta and self.pin_bloqueado_hasta > timezone.now())

    def __str__(self):
        return f"{self.nombre} ({self.rol})"


class SesionToken(models.Model):
    token = models.CharField(max_length=128, unique=True, db_index=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='tokens')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sesion_token'


class Producto(models.Model):
    negocio = models.ForeignKey(Negocio, on_delete=models.PROTECT, related_name='productos')
    nombre = models.CharField(max_length=120)
    precio_vigente = models.PositiveIntegerField()
    categoria = models.CharField(max_length=80, blank=True, default='')
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'producto'
        indexes = [
            models.Index(fields=['negocio', 'activo']),
        ]

    def __str__(self):
        return f"{self.nombre} (${self.precio_vigente})"


class MedioPago(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=60)

    class Meta:
        db_table = 'medio_pago'

    def __str__(self):
        return self.nombre


class Venta(models.Model):
    ESTADO_VIGENTE = 'vigente'
    ESTADO_POR_ANULAR = 'por_anular'
    ESTADO_ANULADA = 'anulada'
    ESTADOS = [
        (ESTADO_VIGENTE, 'Vigente'),
        (ESTADO_POR_ANULAR, 'Por anular'),
        (ESTADO_ANULADA, 'Anulada'),
    ]

    negocio = models.ForeignKey(Negocio, on_delete=models.PROTECT, related_name='ventas')
    registrada_por = models.ForeignKey(
        Usuario, on_delete=models.PROTECT, related_name='ventas_registradas'
    )
    medio_pago = models.ForeignKey(MedioPago, on_delete=models.PROTECT, related_name='ventas')
    total = models.PositiveIntegerField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default=ESTADO_VIGENTE)
    fecha_hora = models.DateTimeField(default=timezone.now)
    id_cliente = models.UUIDField(default=uuid.uuid4)
    motivo_solicitud = models.CharField(max_length=255, blank=True, default='')
    solicitada_en = models.DateTimeField(null=True, blank=True)
    anulada_por = models.ForeignKey(
        Usuario, null=True, blank=True, on_delete=models.PROTECT, related_name='ventas_anuladas'
    )
    anulada_en = models.DateTimeField(null=True, blank=True)
    restituida_por = models.ForeignKey(
        Usuario, null=True, blank=True, on_delete=models.PROTECT, related_name='ventas_restituidas'
    )
    restituida_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'venta'
        constraints = [
            models.UniqueConstraint(
                fields=['negocio', 'id_cliente'],
                name='uq_venta_negocio_id_cliente',
            )
        ]
        indexes = [
            models.Index(fields=['negocio', 'fecha_hora']),
            models.Index(fields=['negocio', 'registrada_por', 'fecha_hora']),
            models.Index(fields=['negocio', 'medio_pago', 'fecha_hora']),
        ]

    def __str__(self):
        return f"Venta #{self.id:04d} - ${self.total} ({self.estado})"


class DetalleVenta(models.Model):
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='detalles_venta')
    nombre_producto = models.CharField(max_length=120)
    precio_unitario = models.PositiveIntegerField()
    cantidad = models.PositiveIntegerField()

    class Meta:
        db_table = 'detalle_venta'

    @property
    def subtotal(self) -> int:
        return self.precio_unitario * self.cantidad


class RegistroAuditoria(models.Model):
    negocio = models.ForeignKey(Negocio, on_delete=models.PROTECT, related_name='auditorias')
    usuario = models.ForeignKey(
        Usuario, null=True, blank=True, on_delete=models.PROTECT, related_name='auditorias'
    )
    accion = models.CharField(max_length=80)
    entidad = models.CharField(max_length=80)
    entidad_id = models.IntegerField(null=True, blank=True)
    detalle = models.TextField(blank=True, default='')
    fecha_hora = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'registro_auditoria'
        indexes = [
            models.Index(fields=['negocio', 'fecha_hora']),
        ]
