// src/app/features/auth/login/login.component.ts
import { Component, OnInit } from '@angular/core';
// Import necessary modules directly for standalone components
import { CommonModule } from '@angular/common'; // Import CommonModule or NgIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // Import ReactiveFormsModule here
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
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  private returnUrl: string = '/';

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
     if (this.authService.isLoggedIn()) {
       this.navigateToDashboard();
     }
     this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.getDefaultDashboardRoute();
  }

  onSubmit(): void {
    this.errorMessage = null;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.authService.login(this.loginForm.value)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: () => {
          console.log('Login successful, navigating...');
          this.navigateToDashboard();
        },
        error: (err) => {
          console.error('Login failed:', err);
          this.errorMessage = err.error?.detail || 'Login failed. Please check your credentials.';
        }
      });
  }

   private navigateToDashboard(): void {
        const destination = this.returnUrl && this.returnUrl !== '/' ? this.returnUrl : this.getDefaultDashboardRoute();
        console.log("Attempting navigation to:", destination);
        this.router.navigateByUrl(destination).catch(navErr => {
          console.error("Navigation failed:", navErr);
          this.router.navigate(['/']);
        });
   }

   private getDefaultDashboardRoute(): string {
      const role = this.authService.getUserRole();
      console.log("User role for redirect:", role);
       if (role === 'PATIENT') {
           return '/patient/dashboard';
         } else if (role === 'DOCTOR') {
           return '/doctor/dashboard';
         } else {
           console.warn("Role not determined, falling back to home.");
           return '/';
         }
     }

  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }
}