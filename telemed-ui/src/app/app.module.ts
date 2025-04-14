// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
// FormsModule/ReactiveFormsModule are imported by standalone components now

// AppRoutingModule is removed, routing provided in main.ts
// import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component'; // Import standalone AppComponent

// Core
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';

// Import standalone components USED IN AppComponent's template
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';

// AuthModule likely removed if Login/Register are standalone
// import { AuthModule } from './features/auth/auth.module';

@NgModule({
  declarations: [
    // NO declarations here if all components are standalone
  ],
  imports: [
    // Angular Core Modules needed across the app (often provided by bootstrapApplication)
    BrowserModule, // Typically needed once
    // AppRoutingModule, // REMOVED
    HttpClientModule, // Needed if not provided elsewhere
    BrowserAnimationsModule, // Needed if not provided elsewhere

    // Standalone components used directly by AppComponent template
    HeaderComponent,
    FooterComponent,
    AppComponent // Import the root component itself

    // AuthModule, // REMOVE if components are standalone & routing is functional
  ],
  providers: [
    // Interceptors are often provided via provideHttpClient in main.ts now
    // Keep here if using older provide methods or specific DI needs
     { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  // NO bootstrap array needed for standalone bootstrapApplication
  // bootstrap: [AppComponent]
})
export class AppModule { } // Note: This AppModule might become unnecessary if AppComponent is fully standalone and providers are moved to main.ts