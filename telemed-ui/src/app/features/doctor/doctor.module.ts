import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms'; // Needed if forms are used (e.g., adding notes)
import { NgxChartsModule } from '@swimlane/ngx-charts'; // If doctors view charts

import { DoctorRoutingModule } from './doctor-routing.module';
import { DoctorDashboardComponent } from './dashboard/dashboard.component';
import { PatientListComponent } from './patient-list/patient-list.component';
// import { PatientDetailComponent } from './patient-detail/patient-detail.component';
import { DoctorAppointmentsComponent } from './appointments/appointments.component';
import { DoctorProfileComponent } from './profile/profile.component';

// Import SharedModule if needed
// import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    DoctorDashboardComponent,
    PatientListComponent,
    // PatientDetailComponent,
    DoctorAppointmentsComponent,
    DoctorProfileComponent
  ],
  imports: [
    CommonModule,
    DoctorRoutingModule,
    ReactiveFormsModule,
    NgxChartsModule, // Import if using charts
    // SharedModule
  ]
})
export class DoctorModule { }