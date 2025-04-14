// src/app/features/auth/auth.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { ReactiveFormsModule } from '@angular/forms'; // Import ReactiveFormsModule

import { AuthRoutingModule } from './auth-routing.module'; // Assuming you have this
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';

// Import SharedModule if you use shared components/directives within Auth components
// import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    LoginComponent,
    RegisterComponent
  ],
  imports: [
    // Angular Modules needed by components declared in this module
    CommonModule,         // Provides *ngIf, *ngFor, etc.
    ReactiveFormsModule,  // Provides formGroup, formControlName, etc.

    // Routing for this feature
    AuthRoutingModule,

    // Import SharedModule if needed
    // SharedModule
  ]
  // No need to export components if they are only used via routing
})
export class AuthModule { }