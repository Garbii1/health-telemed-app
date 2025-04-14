// src/app/features/patient/patient.routes.ts
import { Routes } from '@angular/router';

// Import STANDALONE components directly
import { PatientDashboardComponent } from './dashboard/dashboard.component';
import { PatientVitalsComponent } from './vitals/vitals.component'; // Assumes this component manages standalone VitalsForm/VitalsHistory
import { PatientAppointmentsComponent } from './appointments/appointments.component';
import { BookAppointmentComponent } from './book-appointment/book-appointment.component';
import { PatientProfileComponent } from './profile/profile.component';

// Define routes for the patient feature area
export const PATIENT_ROUTES: Routes = [
  // Redirect base /patient path to dashboard
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  { path: 'dashboard', component: PatientDashboardComponent },
  { path: 'vitals', component: PatientVitalsComponent }, // Parent component for vitals view/form/history
  { path: 'appointments', component: PatientAppointmentsComponent },
  { path: 'book-appointment', component: BookAppointmentComponent },
  { path: 'profile', component: PatientProfileComponent },

  // Add other patient-specific routes here if needed
  // Example: { path: 'vitals/:id', component: VitalsDetailComponent } // If you add a detail view later
];