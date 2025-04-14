// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // Use withInterceptors
import { provideAnimations } from '@angular/platform-browser/animations';

import { AppComponent } from './app/app.component'; // Import standalone AppComponent
import { appRoutes } from './app/app.routes'; // Import the routes array

// Import the functional interceptor
import { jwtInterceptorFn } from './app/core/interceptors/jwt.interceptor.fn';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes), // Provide routes defined in app.routes.ts
    provideHttpClient(
        withInterceptors([jwtInterceptorFn]) // Provide HttpClient WITH the functional interceptor
    ),
    provideAnimations(), // Provide animations globally

    // No need for class-based interceptor providers if using the functional one above
    // No need to import providers from AppModule unless it has specific global providers left

    // Add other global providers here if necessary
  ]
}).catch(err => console.error(err));