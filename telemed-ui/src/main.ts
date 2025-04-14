// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core'; // To import providers from NgModules if needed

import { AppComponent } from './app/app.component'; // Import standalone AppComponent
import { appRoutes } from './app/app.routes'; // Import the routes array
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from './app/core/interceptors/jwt.interceptor';

// If AppModule provides necessary global services/config (unlikely here), import its providers
// import { AppModule } from './app/app.module';


bootstrapApplication(AppComponent, {
  providers: [
    // Import providers from AppModule if it still exists and provides things
    // importProvidersFrom(AppModule), // Usually not needed if AppModule is just declarations/imports

    // Provide essential services functionally
    provideRouter(appRoutes),
    provideHttpClient(withInterceptorsFromDi()), // Configures HttpClient and allows DI for interceptors
    provideAnimations(), // Enable animations

    // Provide interceptor directly if not using withInterceptorsFromDi or needing specific order
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },

    // Add other global providers here if necessary
  ]
}).catch(err => console.error(err));