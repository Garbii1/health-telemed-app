// src/app/features/doctor/doctor.routes.ts
import { Routes } from '@angular/router';

// Import STANDALONE components directly
import { DoctorDashboardComponent } from './dashboard/dashboard.component';
import { PatientListComponent } from './patient-list/patient-list.component';
// import { PatientDetailComponent } from './patient-detail/patient-detail.component'; // Uncomment if created and standalone
import { DoctorAppointmentsComponent } from './appointments/appointments.component';
import { DoctorProfileComponent } from './profile/profile.component';

// Define routes for the doctor feature area
export const DOCTOR_ROUTES: Routes = [
   // Redirect base /doctor path to dashboard
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  { path: 'dashboard', component: DoctorDashboardComponent },
  { path: 'patients', component: PatientListComponent },
  // { path: 'patients/:id', component: PatientDetailComponent }, // Route for viewing a specific patient (if implemented)
  { path: 'appointments', component: DoctorAppointmentsComponent }, // Doctor's schedule view
  { path: 'profile', component: DoctorProfileComponent },

  // Add other doctor-specific routes here if needed
];