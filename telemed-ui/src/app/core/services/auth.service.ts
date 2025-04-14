// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
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
  // Add other payload fields if needed
}

// Interface for user data we might want to store/expose
export interface UserInfo {
  id: number; // id is required
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

  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());
  private currentUser = new BehaviorSubject<UserInfo | null>(null);
  private currentUserRole = new BehaviorSubject<string | null>(null);

  loggedIn$ = this.loggedIn.asObservable();
  currentUser$ = this.currentUser.asObservable();
  currentUserRole$ = this.currentUserRole.asObservable();

  constructor(private http: HttpClient, private router: Router) {
     if (this.hasToken()) {
       this.decodeAndSetUser();
       this.fetchAndSetUserProfile();
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
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.loggedIn.next(false);
    this.currentUser.next(null);
    this.currentUserRole.next(null);
    this.router.navigate(['/login']);
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

  private hasToken(): boolean {
    return !!localStorage.getItem(this.accessTokenKey);
  }

  private handleAuthentication(response: LoginResponse): void {
    if (response.access && response.refresh) {
      localStorage.setItem(this.accessTokenKey, response.access);
      localStorage.setItem(this.refreshTokenKey, response.refresh);
      this.loggedIn.next(true);
      this.decodeAndSetUser();
      this.fetchAndSetUserProfile();
    } else {
      console.error('Authentication failed: No tokens received.');
      this.logout();
    }
  }

  private decodeAndSetUser(): void {
     const token = this.getAccessToken();
     if (token) {
       try {
         const decoded: UserPayload = jwtDecode(token);
         // Ensure id is present before creating UserInfo
         if (decoded.user_id) {
             const userInfo: UserInfo = { id: decoded.user_id }; // id is guaranteed here
             const expiry = decoded.exp * 1000;
             if (Date.now() >= expiry) {
                console.warn('Token expired');
                this.logout();
                return;
             }
             this.currentUser.next(userInfo);
         } else {
            console.error("JWT does not contain user_id claim.");
            this.logout();
         }
       } catch (error) {
         console.error('Error decoding token:', error);
         this.logout();
       }
     }
   }

  fetchAndSetUserProfile(): void {
    if (!this.isLoggedIn()) return;

    this.http.get<any>(`${this.apiUrl}/profile/`).subscribe({
      next: (profile) => {
        const currentVal = this.currentUser.value;
        // FIX: Check currentVal exists before spreading
        if (currentVal) {
            this.currentUser.next({
                ...currentVal, // Now safe to spread
                username: profile.user.username,
                email: profile.user.email,
            });
        } else {
            // Handle case where currentUser was null (e.g., token decoded but profile fetched before value set)
            console.warn("Current user was null when profile fetched, setting basic info.");
             this.currentUser.next({ // Set directly from profile data
                 id: profile.user.id, // Assuming profile has user.id
                 username: profile.user.username,
                 email: profile.user.email,
                 // role: profile.role // Role is set below anyway
             });
        }
        this.currentUserRole.next(profile.role);
      },
      error: (err) => {
        console.error('Failed to fetch user profile:', err);
         if (err.status === 401) {
            this.logout();
         }
      }
    });
  }

}