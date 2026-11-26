import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { UsuarioAuth } from './models';

export const API_URL = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'vf_token';
  private readonly USER_KEY = 'vf_user';

  usuario = signal<UsuarioAuth | null>(this.cargarUsuario());
  pinDesbloqueadoSeccion = signal<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {}

  private cargarUsuario(): UsuarioAuth | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  estaAutenticado(): boolean {
    return !!this.getToken() && !!this.usuario();
  }

  esAdmin(): boolean {
    return this.usuario()?.rol === 'administrador';
  }

  login(identificador: string, password: string) {
    return this.http
      .post<{ token: string; usuario: UsuarioAuth }>(`${API_URL}/auth/login/`, {
        identificador,
        password,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.usuario));
          this.usuario.set(res.usuario);
          this.pinDesbloqueadoSeccion.set(null);
        })
      );
  }

  verifyPin(pin: string) {
    return this.http.post<{ verified: boolean }>(`${API_URL}/auth/verify-pin/`, { pin });
  }

  logout() {
    const token = this.getToken();
    if (token) {
      this.http.post(`${API_URL}/auth/logout/`, {}).subscribe({ error: () => {} });
    }
    this.limpiarSesion();
  }

  limpiarSesion() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.usuario.set(null);
    this.pinDesbloqueadoSeccion.set(null);
    this.router.navigate(['/login']);
  }
}
