// src/app/features/auth/login/login.component.ts
import { Component, OnInit } from '@angular/core';
// Import necessary modules directly for standalone components
import { CommonModule } from '@angular/common'; // Or NgIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router'; // Import RouterLink
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true, // Mark as standalone
  imports: [
      CommonModule,          // Import CommonModule for *ngIf etc.
      ReactiveFormsModule,   // Import ReactiveFormsModule for form directives
      RouterLink             // Import RouterLink for routerLink directive
      // No need to import other components unless used directly in THIS template
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  private returnUrl: string = '/'; // Default redirect URL

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
     // Redirect if already logged in
     if (this.authService.isLoggedIn()) {
       this.navigateToDashboard();
     }
     // Get the return URL from route parameters or default based on role
     this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.getDefaultDashboardRoute();
  }

  onSubmit(): void {
    this.errorMessage = null; // Clear previous errors
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); // Mark fields as touched to show errors
      return;
    }

    this.isLoading = true;
    this.authService.login(this.loginForm.value)
      .pipe(finalize(() => this.isLoading = false)) // Ensure isLoading is set to false
      .subscribe({
        next: () => {
          console.log('Login successful');
          this.navigateToDashboard(); // Redirect after successful login
        },
        error: (err) => {
          console.error('Login failed:', err);
          this.errorMessage = err.error?.detail || 'Login failed. Please check your credentials.';
        }
      });
  }

   // Helper to navigate based on role after login
   private navigateToDashboard(): void {
        const destination = this.returnUrl && this.returnUrl !== '/' ? this.returnUrl : this.getDefaultDashboardRoute();
        console.log("Navigating to:", destination);
        this.router.navigateByUrl(destination);
   }

   private getDefaultDashboardRoute(): string {
      const role = this.authService.getUserRole(); // Get role synchronously if possible, or subscribe
       if (role === 'PATIENT') {
           return '/patient/dashboard';
         } else if (role === 'DOCTOR') {
           return '/doctor/dashboard';
         } else {
           return '/'; // Fallback to home
         }
     }

  // Helper for template validation access
  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }
}