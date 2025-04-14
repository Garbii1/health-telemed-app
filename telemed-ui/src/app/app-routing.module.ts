import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

// Eagerly loaded components (or create a PublicFeatures module)
import { HomeComponent } from './features/public/home/home.component'; // Create this next
import { LoginComponent } from './features/auth/login/login.component'; // Create this
import { RegisterComponent } from './features/auth/register/register.component'; // Create this
import { NotFoundComponent } from './features/public/not-found/not-found.component'; // Create this

const routes: Routes = [
  // Public routes
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent }, // Handle /login directly
  { path: 'register', component: RegisterComponent }, // Handle /register directly

  // Patient routes (Lazy loaded)
  {
    path: 'patient',
    loadChildren: () => import('./features/patient/patient.module').then(m => m.PatientModule),
    canActivate: [AuthGuard, RoleGuard], // Protect parent route
    data: { expectedRoles: ['PATIENT'] } // Specify role for RoleGuard
  },

  // Doctor routes (Lazy loaded)
  {
    path: 'doctor',
    loadChildren: () => import('./features/doctor/doctor.module').then(m => m.DoctorModule),
    canActivate: [AuthGuard, RoleGuard], // Protect parent route
    data: { expectedRoles: ['DOCTOR'] } // Specify role for RoleGuard
  },

   // Generic Profile route (could be in a separate User module or handled within Patient/Doctor)
   // Example: Redirect based on role or have a shared profile component?
   // Let's put profile editing within Patient/Doctor modules for now.

  // Fallback route for unknown paths
  { path: 'not-found', component: NotFoundComponent },
  { path: '**', redirectTo: '/not-found' } // Redirect any other path to not-found page
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
      // Optional: Configure scrolling behavior on navigation
      scrollPositionRestoration: 'enabled', // Restores scroll position
      anchorScrolling: 'enabled', // Enables scrolling to anchors
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }