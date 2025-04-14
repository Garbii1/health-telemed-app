import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PatientDashboardComponent } from './dashboard/dashboard.component';
import { PatientVitalsComponent } from './vitals/vitals.component';
import { PatientAppointmentsComponent } from './appointments/appointments.component';
import { BookAppointmentComponent } from './book-appointment/book-appointment.component';
import { PatientProfileComponent } from './profile/profile.component';

// Define routes within the patient module
const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // Default route for /patient
  { path: 'dashboard', component: PatientDashboardComponent },
  { path: 'vitals', component: PatientVitalsComponent }, // Parent component for vitals view/form
  { path: 'appointments', component: PatientAppointmentsComponent },
  { path: 'book-appointment', component: BookAppointmentComponent },
  { path: 'profile', component: PatientProfileComponent },
  // Add other patient-specific routes here
];

@NgModule({
  imports: [RouterModule.forChild(routes)], // Use forChild for feature modules
  exports: [RouterModule]
})
export class PatientRoutingModule { }