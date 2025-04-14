// src/app/features/patient/patient.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms'; // Keep for forms used within non-standalone components OR standalone components
import { NgxChartsModule } from '@swimlane/ngx-charts'; // Keep for charts

import { PatientRoutingModule } from './patient-routing.module';

// Import NON-standalone components that BELONG to this module
import { PatientDashboardComponent } from './dashboard/dashboard.component'; // Assuming this is NOT standalone
import { PatientVitalsComponent } from './vitals/vitals.component';         // Assuming this is NOT standalone
import { PatientAppointmentsComponent } from './appointments/appointments.component'; // Assuming this is NOT standalone
import { VitalsFormComponent } from './vitals-form/vitals-form.component';       // Assuming this is NOT standalone
import { VitalsHistoryComponent } from './vitals-history/vitals-history.component'; // Assuming this is NOT standalone

// Import STANDALONE components that are ROUTED within this module
import { BookAppointmentComponent } from './book-appointment/book-appointment.component'; // STANDALONE
import { PatientProfileComponent } from './profile/profile.component';             // STANDALONE

// Import SharedModule if needed
// import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    // ONLY declare NON-standalone components that belong to this module
    PatientDashboardComponent,
    PatientVitalsComponent,
    PatientAppointmentsComponent,
    VitalsFormComponent,
    VitalsHistoryComponent
    // REMOVE BookAppointmentComponent
    // REMOVE PatientProfileComponent
  ],
  imports: [
    CommonModule, // Still needed for directives like *ngIf in NON-standalone components
    ReactiveFormsModule, // Still needed for forms in NON-standalone components
    NgxChartsModule, // Needed for charts
    PatientRoutingModule, // Routing

    // IMPORT Standalone Components that are used/routed here
    BookAppointmentComponent,
    PatientProfileComponent,

    // SharedModule // Import if created and needed
  ]
})
export class PatientModule { }