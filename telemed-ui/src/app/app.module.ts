// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Import Forms Modules

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Core
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';

// Shared Components
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component'; // Import Spinner

// Eagerly Loaded Page Components (declared directly for AppRoutingModule)
import { HomeComponent } from './features/public/home/home.component';
import { NotFoundComponent } from './features/public/not-found/not-found.component';

// Feature Modules (Imported for lazy loading configuration in AppRoutingModule, no need to import components from them here)
// AuthModule will be imported because login/register routes are handled directly in app-routing
import { AuthModule } from './features/auth/auth.module';
// PatientModule and DoctorModule are lazy-loaded via AppRoutingModule loadChildren

// Third-party Modules (like NgxChartsModule should be imported in the feature modules where they are used, e.g., PatientModule, DoctorModule)

@NgModule({
  declarations: [
    AppComponent,
    // Shared Components available globally
    HeaderComponent,
    FooterComponent,
    LoadingSpinnerComponent, // Declare Spinner
    // Eagerly loaded components used by AppRoutingModule directly
    HomeComponent,
    NotFoundComponent,
    // Components from AuthModule (Login, Register) are declared within AuthModule
    // Components from PatientModule/DoctorModule are declared within their respective modules
  ],
  imports: [
    BrowserModule,
    AppRoutingModule, // Must be after BrowserModule
    HttpClientModule,
    BrowserAnimationsModule, // Required for some Angular features and ngx-charts animations
    FormsModule, // Needed for template-driven forms (if any) and ngModel
    ReactiveFormsModule, // Needed for reactive forms (used extensively)

    // Import AuthModule because login/register routes are defined directly in app-routing
    AuthModule,

    // PatientModule and DoctorModule are lazy-loaded in AppRoutingModule, no need to import here.
    // NgxChartsModule is imported within PatientModule and DoctorModule where charts are used.
  ],
  providers: [
    // Provide the JWT Interceptor globally
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }