// src/app/features/auth/register/register.component.ts
import { Component } from '@angular/core'; // Added missing import
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

// Custom Validator (keep as is)
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const password2 = control.get('password2');
  if (password && password2 && password.value !== password2.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true, // Add standalone
  imports: [
    CommonModule,          // For *ngIf
    ReactiveFormsModule,   // For [formGroup], formControlName
    RouterLink             // For routerLink
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent { // Class definition remains the same
  registerForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
        username: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        first_name: ['', Validators.required],
        last_name: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(8)]],
        password2: ['', Validators.required],
        role: ['PATIENT', Validators.required],
        phone_number: [''],
        address: [''],
        date_of_birth: [''],
        specialization: [''],
        license_number: [''],
        emergency_contact_name: [''],
        emergency_contact_phone: ['']
      }, { validators: passwordMatchValidator });

     this.registerForm.get('role')?.valueChanges.subscribe(role => {
          this.updateConditionalValidators(role);
     });
     this.updateConditionalValidators(this.registerForm.get('role')?.value); // Initial check
  }

  updateConditionalValidators(role: string) {
    const specializationControl = this.registerForm.get('specialization');
    const licenseControl = this.registerForm.get('license_number');
    if (role === 'DOCTOR') {
      specializationControl?.setValidators([Validators.required]);
      licenseControl?.setValidators([Validators.required]);
    } else {
      specializationControl?.clearValidators();
      licenseControl?.clearValidators();
    }
    specializationControl?.updateValueAndValidity();
    licenseControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.authService.register(this.registerForm.value)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          this.successMessage = 'Registration successful! You can now log in.';
           setTimeout(() => this.router.navigate(['/login']), 3000);
          this.registerForm.reset({ role: 'PATIENT' });
        },
        error: (err) => {
          console.error('Registration failed:', err);
          if (err.error) {
            let backendErrors = '';
            for (const key in err.error) {
              if (err.error.hasOwnProperty(key)) {
                 if(Array.isArray(err.error[key])) { backendErrors += `${key}: ${err.error[key].join(', ')} \n`; }
                 else { backendErrors += `${key}: ${err.error[key]} \n`; }
              }
            }
            this.errorMessage = backendErrors.trim() || 'Registration failed. Please check your input.';
          } else {
            this.errorMessage = 'An unexpected error occurred during registration.';
          }
        }
      });
  }

   // --- Getters remain the same ---
   get username() { return this.registerForm.get('username'); }
   get email() { return this.registerForm.get('email'); }
   get first_name() { return this.registerForm.get('first_name'); }
   get last_name() { return this.registerForm.get('last_name'); }
   get password() { return this.registerForm.get('password'); }
   get password2() { return this.registerForm.get('password2'); }
   get role() { return this.registerForm.get('role'); }
   get specialization() { return this.registerForm.get('specialization'); }
   get license_number() { return this.registerForm.get('license_number'); }
}