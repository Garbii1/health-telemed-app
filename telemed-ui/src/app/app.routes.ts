// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

// Import standalone components directly
import { HomeComponent } from './features/public/home/home.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { NotFoundComponent } from './features/public/not-found/not-found.component';

export const appRoutes: Routes = [
  // Public routes
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Patient routes (Lazy loading feature routes array)
  {
    path: 'patient',
    // Assuming you create patient.routes.ts exporting PATIENT_ROUTES
    loadChildren: () => import('./features/patient/patient.routes').then(m => m.PATIENT_ROUTES),
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['PATIENT'] }
  },

  // Doctor routes (Lazy loading feature routes array)
  {
    path: 'doctor',
     // Assuming you create doctor.routes.ts exporting DOCTOR_ROUTES
    loadChildren: () => import('./features/doctor/doctor.routes').then(m => m.DOCTOR_ROUTES),
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['DOCTOR'] }
  },

  // Fallback route
  { path: 'not-found', component: NotFoundComponent },
  { path: '**', redirectTo: '/not-found' } // Redirect any other path to not-found page
];