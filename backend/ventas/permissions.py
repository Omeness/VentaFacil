from rest_framework.permissions import BasePermission

from .models import Usuario


class EsAutenticado(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, Usuario) and request.user.activo


class EsAdministrador(BasePermission):
    def has_permission(self, request, view):
        return (
            isinstance(request.user, Usuario)
            and request.user.activo
            and request.user.rol == Usuario.ROL_ADMINISTRADOR
        )
