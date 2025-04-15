// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // Import HttpErrorResponse
import { BehaviorSubject, Observable, tap, switchMap, map, forkJoin, of, throwError } from 'rxjs'; // Import throwError
import { catchError } from 'rxjs/operators'; // Import catchError operator
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

interface LoginResponse {
  access: string;
  refresh: string;
}

interface UserPayload {
  user_id: number;
  exp: number;
}

export interface UserInfo {
  id: number;
  username?: string;
  email?: string;
  role?: string; // Role is crucial for redirection
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private accessTokenKey = 'accessToken';
  private refreshTokenKey = 'refreshToken';

  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());
  private currentUser = new BehaviorSubject<UserInfo | null>(this.getInitialUser()); // Attempt to load initial user
  private currentUserRole = new BehaviorSubject<string | null>(this.getInitialUser()?.role ?? null); // Set initial role

  loggedIn$ = this.loggedIn.asObservable();
  currentUser$ = this.currentUser.asObservable();
  currentUserRole$ = this.currentUserRole.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // If token exists but user wasn't loaded initially (e.g., page refresh), fetch profile
    if (this.hasToken() && !this.currentUser.value) {
       console.log("Token found on load, fetching profile...");
       this.fetchAndSetUserProfile().subscribe({
           error: () => this.logout() // Logout if profile fetch fails on load
       });
    }
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/`, userData); // Keep registration simple
  }

  // Login now returns UserInfo with role after successful auth AND profile fetch
  login(credentials: any): Observable<UserInfo | null> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login/`, credentials).pipe(
      tap(response => { // Store tokens immediately if login call succeeds
        if (response.access && response.refresh) {
            localStorage.setItem(this.accessTokenKey, response.access);
            localStorage.setItem(this.refreshTokenKey, response.refresh);
            this.loggedIn.next(true); // Tentatively set loggedIn
            this.decodeAndSetUser(); // Decode basic info from token
        } else {
             // If login response structure is wrong, throw error to be caught below
             throw new Error('Invalid login response: Missing tokens.');
        }
      }),
      // Use switchMap to fetch profile ONLY AFTER successful login response
      switchMap(() => this.fetchAndSetUserProfile()), // Fetch profile and update subjects
      catchError((error: HttpErrorResponse | Error) => { // Catch errors from login OR profile fetch
        console.error('Login Process Error:', error);
        this.logout(); // Ensure cleanup on any error during login/profile fetch
        // Propagate a user-friendly error or specific details if needed
        return throwError(() => new Error(this.extractErrorMessage(error)));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.loggedIn.next(false);
    this.currentUser.next(null);
    this.currentUserRole.next(null);
    // Avoid navigating within the service if possible, handle in component based on logout action
    // this.router.navigate(['/login']);
  }

  getAccessToken(): string | null { return localStorage.getItem(this.accessTokenKey); }
  getRefreshToken(): string | null { return localStorage.getItem(this.refreshTokenKey); }
  isLoggedIn(): boolean { return this.loggedIn.value; }
  getUserRole(): string | null { return this.currentUserRole.value; }

  private hasToken(): boolean { return !!localStorage.getItem(this.accessTokenKey); }

  private getInitialUser(): UserInfo | null {
      const token = this.getAccessToken();
      if (token) {
          try {
              const decoded: UserPayload = jwtDecode(token);
              const expiry = decoded.exp * 1000;
              if (Date.now() < expiry && decoded.user_id) {
                  // Cannot get role from token easily here, needs profile fetch
                  return { id: decoded.user_id };
              }
          } catch (error) { return null; }
      }
      return null;
  }


  private decodeAndSetUser(): void {
     const token = this.getAccessToken();
     if (token) {
       try {
         const decoded: UserPayload = jwtDecode(token);
         if (decoded.user_id) {
             const expiry = decoded.exp * 1000;
             if (Date.now() >= expiry) {
                console.warn('Token expired during decodeAndSetUser');
                this.logout(); // Logout if expired
                return;
             }
             // Set only basic info available in token, role comes from profile fetch
             if (!this.currentUser.value || this.currentUser.value.id !== decoded.user_id) {
                this.currentUser.next({ id: decoded.user_id });
             }
         } else { this.logout(); } // Logout if essential info missing
       } catch (error) { this.logout(); } // Logout on decode error
     }
   }

  // Fetches profile and updates subjects, returns Observable<UserInfo | null>
  fetchAndSetUserProfile(): Observable<UserInfo | null> {
    if (!this.hasToken()) return of(null); // No token, can't fetch

    return this.http.get<any>(`${this.apiUrl}/profile/`).pipe(
      map(profile => {
        // Validate profile structure
        if (!profile?.user?.id || !profile?.role) {
            console.error("Invalid profile structure received:", profile);
            throw new Error("Invalid profile data received from server.");
        }

        const userInfo: UserInfo = {
            id: profile.user.id,
            username: profile.user.username,
            email: profile.user.email,
            role: profile.role
        };

        this.currentUser.next(userInfo);
        this.currentUserRole.next(profile.role);
        console.log("Profile fetched and subjects updated:", userInfo); // Debug log
        return userInfo; // Return the fetched UserInfo
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to fetch user profile in fetchAndSetUserProfile:', error);
        // Don't necessarily logout here, login process catchError will handle it
        // Propagate error
        return throwError(() => new Error('Failed to fetch profile: ' + this.extractErrorMessage(error)));
      })
    );
  }

  // Helper to extract meaningful error messages
  private extractErrorMessage(error: HttpErrorResponse | Error): string {
      if (error instanceof HttpErrorResponse) {
          if (error.error instanceof ErrorEvent) {
            // A client-side or network error occurred. Handle it accordingly.
            return `Network error: ${error.message}`;
          } else {
            // The backend returned an unsuccessful response code.
            // The response body may contain clues as to what went wrong.
            let detail = 'Unknown server error';
            if(error.error?.detail) {
                detail = error.error.detail;
            } else if (typeof error.error === 'string') {
                 detail = error.error;
            } else if (error.statusText) {
                detail = error.statusText;
            }
            return `Error ${error.status}: ${detail}`;
          }
        } else {
           // Standard Error object
           return error.message;
        }
    }

}