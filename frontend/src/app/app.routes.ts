import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards';
import { AdminInicioComponent } from './pages/admin-inicio.component';
import { EquipoComponent } from './pages/equipo.component';
import { HistorialComponent } from './pages/historial.component';
import { LoginComponent } from './pages/login.component';
import { MenuComponent } from './pages/menu.component';
import { MisVentasComponent } from './pages/mis-ventas.component';
import { NuevaVentaComponent } from './pages/nueva-venta.component';
import { ResumenComponent } from './pages/resumen.component';
import { RevisionAnulacionesComponent } from './pages/revision-anulaciones.component';
import { AdminLayoutComponent } from './shared/admin-layout.component';
import { VendedorLayoutComponent } from './shared/vendedor-layout.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: VendedorLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'vender', component: NuevaVentaComponent },
      { path: 'mis-ventas', component: MisVentasComponent },
      { path: '', redirectTo: 'vender', pathMatch: 'full' },
    ],
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: 'inicio', component: AdminInicioComponent },
      { path: 'vender', component: NuevaVentaComponent },
      { path: 'mis-ventas', component: MisVentasComponent },
      { path: 'anulaciones', component: RevisionAnulacionesComponent },
      { path: 'resumen', component: ResumenComponent },
      { path: 'historial', component: HistorialComponent },
      { path: 'menu', component: MenuComponent },
      { path: 'equipo', component: EquipoComponent },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
