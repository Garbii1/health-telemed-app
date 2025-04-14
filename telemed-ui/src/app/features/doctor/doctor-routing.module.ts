import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DoctorDashboardComponent } from './dashboard/dashboard.component';
import { PatientListComponent } from './patient-list/patient-list.component';
// import { PatientDetailComponent } from './patient-detail/patient-detail.component'; // If created
import { DoctorAppointmentsComponent } from './appointments/appointments.component';
import { DoctorProfileComponent } from './profile/profile.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // Default for /doctor
  { path: 'dashboard', component: DoctorDashboardComponent },
  { path: 'patients', component: PatientListComponent },
  // { path: 'patients/:id', component: PatientDetailComponent }, // Route for viewing a specific patient
  { path: 'appointments', component: DoctorAppointmentsComponent }, // Doctor's schedule
  { path: 'profile', component: DoctorProfileComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DoctorRoutingModule { }