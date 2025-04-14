import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

// Custom Validator for matching passwords
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
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'] // Reuse login styles or create specific ones
})
export class RegisterComponent {
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
      role: ['PATIENT', Validators.required], // Default to Patient
      // Optional Profile fields
      phone_number: [''],
      address: [''],
      date_of_birth: [''],
      // Role specific fields (conditionally required)
      specialization: [''],
      license_number: [''],
      emergency_contact_name: [''],
      emergency_contact_phone: ['']
    }, { validators: passwordMatchValidator }); // Add custom validator at group level

    // Add conditional validators based on role
     this.registerForm.get('role')?.valueChanges.subscribe(role => {
          this.updateConditionalValidators(role);
        });
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
          console.log('Registration successful:', response);
          this.successMessage = 'Registration successful! You can now log in.';
          // Optionally redirect after a short delay
           setTimeout(() => this.router.navigate(['/login']), 3000);
          this.registerForm.reset({ role: 'PATIENT' }); // Reset form keeping default role
        },
        error: (err) => {
          console.error('Registration failed:', err);
          // Handle specific backend errors
          if (err.error) {
            let backendErrors = '';
            for (const key in err.error) {
              if (err.error.hasOwnProperty(key)) {
                 // Handle arrays of errors per field
                 if(Array.isArray(err.error[key])) {
                     backendErrors += `${key}: ${err.error[key].join(', ')} \n`;
                 } else {
                     backendErrors += `${key}: ${err.error[key]} \n`;
                 }
              }
            }
            this.errorMessage = backendErrors || 'Registration failed. Please check your input.';
          } else {
            this.errorMessage = 'An unexpected error occurred during registration.';
          }
        }
      });
  }

  // --- Getters for template validation ---
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