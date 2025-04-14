import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms'; // Import ReactiveFormsModule
import { NgxChartsModule } from '@swimlane/ngx-charts'; // Import NgxChartsModule

import { PatientRoutingModule } from './patient-routing.module';
import { PatientDashboardComponent } from './dashboard/dashboard.component';
import { PatientVitalsComponent } from './vitals/vitals.component';
import { PatientAppointmentsComponent } from './appointments/appointments.component';
import { VitalsFormComponent } from './vitals-form/vitals-form.component';
import { VitalsHistoryComponent } from './vitals-history/vitals-history.component';
import { BookAppointmentComponent } from './book-appointment/book-appointment.component';
import { PatientProfileComponent } from './profile/profile.component';

// Import SharedModule if you have common UI elements (optional but good practice)
// import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    PatientDashboardComponent,
    PatientVitalsComponent,
    PatientAppointmentsComponent,
    VitalsFormComponent,
    VitalsHistoryComponent,
    BookAppointmentComponent,
    PatientProfileComponent
  ],
  imports: [
    CommonModule,
    PatientRoutingModule,
    ReactiveFormsModule, // Add for forms
    NgxChartsModule, // Add for charts
    // SharedModule // Import if created
  ]
})
export class PatientModule { }