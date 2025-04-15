// src/app/features/auth/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, UserInfo } from '../../../core/services/auth.service'; // Import UserInfo
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule, RouterLink ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup = this.fb.group({ // Initialize here
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });
  isLoading = false;
  errorMessage: string | null = null;
  private returnUrl: string = '/';

  constructor(
    private fb: FormBuilder, // Inject FormBuilder
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {} // Constructor can be empty if init is done at declaration

  ngOnInit(): void {
     // Redirect if already logged in (check might need slight delay if initial load is slow)
     if (this.authService.isLoggedIn() && this.authService.getUserRole()) {
       this.navigateToDashboard(this.authService.getUserRole()!); // Navigate if role already known
     }
     // Determine returnUrl (use default dashboard based on potential future role)
     this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/'; // Keep potential returnUrl
  }

  onSubmit(): void {
    this.errorMessage = null;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;

    // Call the refactored login service method
    this.authService.login(this.loginForm.value)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (userInfo) => {
          // Check if userInfo (including role) was successfully obtained
          if (userInfo && userInfo.role) {
            console.log('Login successful, user info:', userInfo);
            this.navigateToDashboard(userInfo.role); // Pass the received role
          } else {
            // This case might happen if login succeeds but profile fetch fails within the service
            this.errorMessage = 'Login succeeded but failed to load profile data. Please try again.';
            // Log out to ensure consistent state if profile is critical
            this.authService.logout();
          }
        },
        error: (err: Error) => { // Catch error propagated from the service
          console.error('Login failed (component):', err);
          // Display the error message prepared by the service
          this.errorMessage = err.message || 'Login failed. Please check credentials or network.';
        }
      });
  }

  // Navigate based on role passed from successful login
  private navigateToDashboard(role: string): void {
        const defaultRoute = this.getDefaultDashboardRoute(role);
        // Use returnUrl only if it's NOT the login/register page itself
        const destination = (this.returnUrl && this.returnUrl !== '/' && !this.returnUrl.includes('/login') && !this.returnUrl.includes('/register'))
                             ? this.returnUrl
                             : defaultRoute;

        console.log(`Navigation - Role: ${role}, ReturnURL: ${this.returnUrl}, Default: ${defaultRoute}, Destination: ${destination}`);

        this.router.navigateByUrl(destination).catch(navErr => {
            console.error("Navigation failed:", navErr);
            this.router.navigate(['/']); // Fallback to home on navigation error
        });
   }

  // Get default route based on provided role
  private getDefaultDashboardRoute(role: string | undefined): string {
       if (role === 'PATIENT') { return '/patient/dashboard'; }
       else if (role === 'DOCTOR') { return '/doctor/dashboard'; }
       else { return '/'; } // Fallback
   }

  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }
}