// src/app/features/auth/register/register.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor etc.
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms'; // For forms
import { Router, RouterLink } from '@angular/router'; // For navigation and routerLink
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

// Custom Validator for matching passwords
// Ensures validation errors are cleared correctly when passwords match
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const password2 = control.get('password2');

  // Don't validate if controls aren't initialized yet
  if (!password || !password2) {
    return null;
  }

  // Clear previous mismatch error before checking again
  if (password2.errors && password2.errors['passwordMismatch']) {
    // Create a new errors object excluding 'passwordMismatch'
    const { passwordMismatch, ...otherErrors } = password2.errors;
    // Set errors to null if no other errors remain, otherwise set the remaining ones
    password2.setErrors(Object.keys(otherErrors).length === 0 ? null : otherErrors);
  }

  // Check for mismatch
  if (password.value !== password2.value) {
    // Set error on password2 control specifically
    password2.setErrors({ ...password2.errors, passwordMismatch: true });
    // Return error at the form group level as well
    return { passwordMismatch: true };
  }

  // Passwords match, return null (no error)
  return null;
}


@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,          // Provides *ngIf, *ngFor etc.
    ReactiveFormsModule,   // Provides [formGroup], formControlName etc.
    RouterLink             // Provides routerLink directive
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  // Declare form property type
  registerForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder, // Inject FormBuilder
    private authService: AuthService,
    private router: Router
  ) {
    // Initialize the form within the constructor
    this.registerForm = this.fb.group({
      // Account Info
      role: ['PATIENT', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', Validators.required],
      // Profile Info (Now Required for All Roles)
      phone_number: ['', Validators.required],
      address: ['', Validators.required],
      date_of_birth: ['', Validators.required],
      // Doctor Specific (Conditional Validators applied later)
      specialization: [''],
      license_number: [''],
      // Patient Specific (Optional Emergency Contact)
      emergency_contact_name: [''],
      emergency_contact_phone: [''],
      emergency_contact_relationship: [''] // Added Relationship Field
    }, { validators: passwordMatchValidator }); // Apply custom validator
  }

  ngOnInit(): void {
      // Set initial conditional validators based on default role
      this.updateConditionalValidators(this.registerForm.get('role')?.value ?? 'PATIENT');

      // Listen for role changes to update validators dynamically
      this.registerForm.get('role')?.valueChanges.subscribe(roleValue => {
          if(roleValue) {
            this.updateConditionalValidators(roleValue);
          }
      });
  }

  // Updates validators based on the selected role
  updateConditionalValidators(role: string): void {
    const specializationControl = this.registerForm.get('specialization');
    const licenseControl = this.registerForm.get('license_number');

    // Phone, Address, DOB validators are already set as required during init

    if (role === 'DOCTOR') {
      // Add required validator for doctor fields
      specializationControl?.setValidators([Validators.required]);
      licenseControl?.setValidators([Validators.required]);
    } else { // If role is PATIENT or anything else
      // Clear validators for doctor fields
      specializationControl?.clearValidators();
      licenseControl?.clearValidators();
      // Optionally reset the values if switching away from Doctor
      // specializationControl?.reset('');
      // licenseControl?.reset('');
    }

    // Update the validity state of these controls after changing validators
    specializationControl?.updateValueAndValidity();
    licenseControl?.updateValueAndValidity();
  }

  // Handles the form submission
  onSubmit(): void {
    console.log('onSubmit function CALLED'); // Debug log

    // Clear previous messages
    this.errorMessage = null;
    this.successMessage = null;

    // Log current form state for debugging
    console.log('Form Value:', this.registerForm.value);
    console.log('Form Status:', this.registerForm.status);
    console.log('Is Form Valid?:', this.registerForm.valid);
    if (!this.registerForm.valid) {
        console.log('--- Control Errors ---');
        Object.keys(this.registerForm.controls).forEach(key => {
          const control = this.registerForm.get(key);
          if (control?.invalid) {
            console.log(`${key}: Status=${control?.status}, Errors=${JSON.stringify(control?.errors)}`);
          }
          // Check nested groups too
          if (control instanceof FormGroup) {
              Object.keys(control.controls).forEach(nestedKey => {
                  const nestedControl = control.get(nestedKey);
                   if (nestedControl?.invalid) {
                        console.log(`  ${key}.${nestedKey}: Status=${nestedControl?.status}, Errors=${JSON.stringify(nestedControl?.errors)}`);
                   }
              });
          }
        });
         console.log('-----------------------');
    }


    // Mark all fields as touched to show validation errors visually
    this.registerForm.markAllAsTouched();

    // Stop if the form is invalid
    if (this.registerForm.invalid) {
      console.error("Register Form IS INVALID. Halting submission.");
      this.errorMessage = "Please correct the errors highlighted in the form.";
      return; // Prevent submission
    }

    // If form is valid, proceed
    console.log('Register Form IS VALID. Proceeding with submission...');
    this.isLoading = true;
    const formData = this.registerForm.getRawValue(); // Use getRawValue if disabled fields should be included (like username)

    // **Backend Check**: Ensure the backend expects/handles all fields,
    // including 'emergency_contact_relationship'. Adjust payload if needed.

    this.authService.register(formData)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          console.log('Registration successful response:', response);
          this.successMessage = 'Account created successfully! Redirecting to login...';
          // Redirect to login page after a short delay to show the message
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2500);
        },
        error: (err) => {
          console.error('Registration failed:', err);
          // Try to parse backend errors for display
          if (err.error && typeof err.error === 'object') {
            let backendErrors = '';
            for (const key in err.error) {
              if (err.error.hasOwnProperty(key)) {
                 const messages = Array.isArray(err.error[key]) ? err.error[key].join(', ') : err.error[key];
                 backendErrors += `- ${key}: ${messages}\n`; // Use bullets for readability
              }
            }
            this.errorMessage = `Registration failed:\n${backendErrors.trim()}`;
          } else if (typeof err.error === 'string') {
             this.errorMessage = err.error; // Display plain string error
          } else if (err.message) {
              this.errorMessage = err.message; // Display error message if available
          }
          else {
            this.errorMessage = 'An unexpected error occurred. Please try again.';
          }
        }
      });
  }

   // Getters for easy template access to form controls
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