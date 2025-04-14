import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode'; // Install: npm install jwt-decode

interface LoginResponse {
  access: string;
  refresh: string;
}

interface UserPayload {
  user_id: number;
  exp: number;
  // Add other payload fields if needed (e.g., username, role - depends on JWT config)
}

// Interface for user data we might want to store/expose
export interface UserInfo {
  id: number;
  username?: string;
  email?: string;
  role?: string; // We'll fetch this separately from profile endpoint
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private accessTokenKey = 'accessToken';
  private refreshTokenKey = 'refreshToken';

  // BehaviorSubject to track authentication status and user info
  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());
  private currentUser = new BehaviorSubject<UserInfo | null>(null);
  private currentUserRole = new BehaviorSubject<string | null>(null); // Patient | Doctor

  loggedIn$ = this.loggedIn.asObservable();
  currentUser$ = this.currentUser.asObservable();
  currentUserRole$ = this.currentUserRole.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // If token exists on init, try to decode it and fetch profile
     if (this.hasToken()) {
       this.decodeAndSetUser();
       this.fetchAndSetUserProfile(); // Fetch profile on load if logged in
     }
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/`, userData);
  }

  login(credentials: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login/`, credentials)
      .pipe(
        tap(response => this.handleAuthentication(response))
      );
  }

  logout(): void {
    // Optionally: Call a backend endpoint to blacklist the token if needed
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.loggedIn.next(false);
    this.currentUser.next(null);
    this.currentUserRole.next(null);
    this.router.navigate(['/login']); // Redirect to login page
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  isLoggedIn(): boolean {
    return this.loggedIn.value;
  }

  getUserRole(): string | null {
     return this.currentUserRole.value;
   }

  // --- Private Helper Methods ---

  private hasToken(): boolean {
    return !!localStorage.getItem(this.accessTokenKey);
  }

  private handleAuthentication(response: LoginResponse): void {
    if (response.access && response.refresh) {
      localStorage.setItem(this.accessTokenKey, response.access);
      localStorage.setItem(this.refreshTokenKey, response.refresh);
      this.loggedIn.next(true);
      this.decodeAndSetUser(); // Decode token immediately
      this.fetchAndSetUserProfile(); // Fetch profile info after login
    } else {
      console.error('Authentication failed: No tokens received.');
      this.logout(); // Ensure clean state if login fails partially
    }
  }

  private decodeAndSetUser(): void {
     const token = this.getAccessToken();
     if (token) {
       try {
         const decoded: UserPayload = jwtDecode(token);
         const userInfo: UserInfo = { id: decoded.user_id };
         // Check if token is expired (optional, interceptor usually handles this)
         const expiry = decoded.exp * 1000; // Convert to milliseconds
         if (Date.now() >= expiry) {
            console.warn('Token expired');
            this.logout(); // Or trigger refresh token logic
            return;
         }
         this.currentUser.next(userInfo); // Set basic info from token
       } catch (error) {
         console.error('Error decoding token:', error);
         this.logout(); // Log out if token is invalid
       }
     }
   }

  // Method to fetch user profile (including role) after login or on app load
  fetchAndSetUserProfile(): void {
    if (!this.isLoggedIn()) return;

    this.http.get<any>(`${this.apiUrl}/profile/`).subscribe({
      next: (profile) => {
        // Update currentUser with more details if needed
        this.currentUser.next({
            ...this.currentUser.value, // Keep existing id
            username: profile.user.username,
            email: profile.user.email,
            // add other fields as needed
        });
        this.currentUserRole.next(profile.role); // Store the role
      },
      error: (err) => {
        console.error('Failed to fetch user profile:', err);
        // Potentially log out if profile fetch fails consistently (maybe token invalid?)
         if (err.status === 401) { // Unauthorized
            this.logout();
         }
      }
    });
  }

  // Add refresh token logic here if needed (more complex)
  // refreshToken(): Observable<any> { ... }
}