// src/app/core/interceptors/jwt.interceptor.fn.ts
import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service'; // Inject AuthService
import { environment } from '../../../environments/environment';

export const jwtInterceptorFn: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

  // Inject services needed
  const authService = inject(AuthService);

  const isLoggedIn = authService.isLoggedIn();
  const token = authService.getAccessToken();
  const isApiUrl = req.url.startsWith(environment.apiUrl); // Check if the request is to our API

  // Clone the request and add the authorization header if logged in, token exists, and it's an API URL
  if (isLoggedIn && isApiUrl && token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Pass the cloned or original request to the next handler
  return next(req);
};