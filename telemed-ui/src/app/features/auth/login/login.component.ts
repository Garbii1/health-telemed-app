import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
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
     // Get the return URL from route parameters or default to '/'
     this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
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
          this.errorMessage = err.error?.detail || 'Login failed. Please check your credentials.'; // Show specific error from backend if available
        }
      });
  }

   // Helper to navigate based on role after login
   private navigateToDashboard(): void {
     this.authService.currentUserRole$.subscribe(role => {
       if (role === 'PATIENT') {
         this.router.navigateByUrl(this.returnUrl !== '/' ? this.returnUrl : '/patient/dashboard');
       } else if (role === 'DOCTOR') {
         this.router.navigateByUrl(this.returnUrl !== '/' ? this.returnUrl : '/doctor/dashboard');
       } else {
         // Fallback if role isn't set yet or unknown, maybe wait? Or go home.
         this.router.navigateByUrl(this.returnUrl); // Go to original intended url or home
       }
     });
   }

  // Helper for template validation access
  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }
}