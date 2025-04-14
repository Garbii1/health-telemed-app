// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// AppRoutingModule is removed
// Feature Modules (AuthModule, PatientModule, DoctorModule) are removed

import { AppComponent } from './app.component'; // Import standalone AppComponent

// Core
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';

// Import standalone components USED IN AppComponent's template
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';

@NgModule({
  declarations: [
    // NO declarations here - all components are standalone
  ],
  imports: [
    // Core Angular Modules - BrowserModule only once
    BrowserModule,
    // HttpClientModule & BrowserAnimationsModule are often provided functionally in main.ts
    // Keep them here if using older DI patterns or if AppProviders require them
    HttpClientModule,
    BrowserAnimationsModule,

    // Standalone components used directly by AppComponent template *must* be imported by AppComponent itself
    // AppComponent needs to be imported here because it's the root component, though bootstrapped separately
    AppComponent,
    // HeaderComponent, // These are imported directly by AppComponent now
    // FooterComponent,

  ],
  providers: [
    // Providing interceptors here is still valid if not using provideHttpClient(withInterceptorsFromDi()) in main.ts
    // It's generally cleaner to provide them in main.ts
    // { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  // NO bootstrap array needed for standalone bootstrapApplication
})
export class AppModule { }