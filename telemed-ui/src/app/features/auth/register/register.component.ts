// src/app/features/auth/register/register.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

// Custom Validator for matching passwords
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const password2 = control.get('password2');
  // Check if controls exist and have values before comparing
  if (password && password2 && password.value !== password2.value) {
    // Set error on the 'password2' control for specific feedback
    password2.setErrors({ ...password2.errors, passwordMismatch: true });
    return { passwordMismatch: true }; // Return error at the form group level too
  }
  // If passwords match, clear the mismatch error from password2 if it exists
  if (password2?.hasError('passwordMismatch')) {
      const errors = { ...password2.errors };
      delete errors['passwordMismatch'];
      // Set errors to null if no other errors exist, otherwise set remaining errors
      password2.setErrors(Object.keys(errors).length > 0 ? errors : null);
  }
  return null; // Passwords match or controls not ready
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup; // Declare type only
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Initialize form in constructor
    this.registerForm = this.fb.group({
      role: ['PATIENT', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', Validators.required],
      // Profile Info - Now Required
      phone_number: ['', Validators.required],
      address: ['', Validators.required],
      date_of_birth: ['', Validators.required],
      // Doctor Specific (Conditional Validators applied later)
      specialization: [''],
      license_number: [''],
      // Patient Specific (Optional Emergency Contact)
      emergency_contact_name: [''],
      emergency_contact_phone: [''],
      emergency_contact_relationship: [''] // New field
    }, { validators: passwordMatchValidator }); // Apply custom validator at group level
  }

  ngOnInit(): void {
      // Set initial conditional validators
      this.updateConditionalValidators(this.registerForm.get('role')?.value ?? 'PATIENT');

      // Listen for role changes to update validators dynamically
      this.registerForm.get('role')?.valueChanges.subscribe(roleValue => {
          if(roleValue) {
            this.updateConditionalValidators(roleValue);
          }
      });
  }

  updateConditionalValidators(role: string): void {
    const specializationControl = this.registerForm.get('specialization');
    const licenseControl = this.registerForm.get('license_number');

    // Profile fields (phone, address, dob) have required validator set at init

    // Conditional for Doctor
    if (role === 'DOCTOR') {
      specializationControl?.setValidators([Validators.required]);
      licenseControl?.setValidators([Validators.required]);
      // Clear patient-specific fields if switching to Doctor (optional)
      // this.registerForm.get('emergency_contact_name')?.reset('');
      // this.registerForm.get('emergency_contact_phone')?.reset('');
      // this.registerForm.get('emergency_contact_relationship')?.reset('');
    } else { // PATIENT or other roles
      specializationControl?.clearValidators();
      licenseControl?.clearValidators();
      // Clear doctor-specific fields if switching away from Doctor (optional)
      // specializationControl?.reset('');
      // licenseControl?.reset('');
    }

    // Update the validity state of the controls
    specializationControl?.updateValueAndValidity();
    licenseControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.registerForm.invalid) {
      console.error("Register Form Invalid. Errors:", this.registerForm.errors);
      console.error("Control States:", this.registerForm.controls);
      // Mark all fields as touched to display validation errors
      this.registerForm.markAllAsTouched();
      this.errorMessage = "Please fix the errors in the form."; // Generic message
      return;
    }

    this.isLoading = true;
    const formData = this.registerForm.value;

    // **Backend Check**: Ensure your backend serializer correctly handles
    // the 'emergency_contact_relationship' field if it's sent for Patients.
    // If the backend PatientProfile doesn't have this field, you might need to
    // exclude it from the payload before sending if role === 'PATIENT'.
    // Example (if needed):
    // const payload = {...formData};
    // if (payload.role === 'PATIENT') {
    //    delete payload.specialization;
    //    delete payload.license_number;
    //    // Adapt based on backend model/serializer for emergency contact
    // } else if (payload.role === 'DOCTOR') {
    //    delete payload.emergency_contact_name;
    //    delete payload.emergency_contact_phone;
    //    delete payload.emergency_contact_relationship;
    // }


    this.authService.register(formData) // Send the full form data for now
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          console.log('Registration successful:', response);
          // Show success message
          this.successMessage = 'Account created successfully! Redirecting to login...';
          // Redirect to login page after a short delay
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2500); // Adjust delay as needed
        },
        error: (err) => {
          console.error('Registration failed:', err);
          // Try to parse backend errors
          if (err.error && typeof err.error === 'object') {
            let backendErrors = '';
            for (const key in err.error) {
              if (err.error.hasOwnProperty(key)) {
                 const messages = Array.isArray(err.error[key]) ? err.error[key].join(', ') : err.error[key];
                 backendErrors += `${key}: ${messages}\n`;
              }
            }
            this.errorMessage = backendErrors.trim() || 'Registration failed. Please check details.';
          } else if (err.error?.detail) {
             this.errorMessage = err.error.detail;
          }
          else {
            this.errorMessage = 'An unexpected error occurred during registration.';
          }
        }
      });
  }

   // Getters for template validation access
   get role() { return this.registerForm.get('role'); }
   get username() { return this.registerForm.get('username'); }
   get email() { return this.registerForm.get('email'); }
   get first_name() { return this.registerForm.get('first_name'); }
   get last_name() { return this.registerForm.get('last_name'); }
   get password() { return this.registerForm.get('password'); }
   get password2() { return this.registerForm.get('password2'); }
   get phone_number() { return this.registerForm.get('phone_number'); }
   get address() { return this.registerForm.get('address'); }
   get date_of_birth() { return this.registerForm.get('date_of_birth'); }
   get specialization() { return this.registerForm.get('specialization'); }
   get license_number() { return this.registerForm.get('license_number'); }
   get emergency_contact_name() { return this.registerForm.get('emergency_contact_name'); }
   get emergency_contact_phone() { return this.registerForm.get('emergency_contact_phone'); }
   get emergency_contact_relationship() { return this.registerForm.get('emergency_contact_relationship'); }
}