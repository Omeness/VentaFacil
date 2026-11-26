from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import SesionToken


class BearerTokenAuthentication(BaseAuthentication):
    """Autenticación por token Bearer almacenado en SesionToken."""

    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            raise AuthenticationFailed('Formato de token inválido.')

        token_str = parts[1]
        try:
            sesion = SesionToken.objects.select_related('usuario', 'usuario__negocio').get(
                token=token_str
            )
        except SesionToken.DoesNotExist:
            raise AuthenticationFailed('Sesión inválida o expirada.')

        if not sesion.usuario.activo or not sesion.usuario.negocio.activo:
            raise AuthenticationFailed('Cuenta deshabilitada.')

        return (sesion.usuario, sesion)
