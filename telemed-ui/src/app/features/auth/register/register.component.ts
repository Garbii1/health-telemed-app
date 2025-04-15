// src/app/features/auth/register/register.component.ts
import { Component, OnInit } from '@angular/core'; // Add OnInit
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null { /* ... */ return null;}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule, RouterLink ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit { // Implement OnInit
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
      // Account Info
      role: ['PATIENT', Validators.required], // Now a dropdown
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', Validators.required],
      // Profile Info (Now required)
      phone_number: ['', Validators.required], // Make required
      address: ['', Validators.required],       // Make required
      date_of_birth: ['', Validators.required], // Make required
      // Doctor Specific (Conditional)
      specialization: [''], // Keep validators conditional
      license_number: [''], // Keep validators conditional
      // Patient Specific (Optional Emergency + Relationship)
      emergency_contact_name: [''],
      emergency_contact_phone: [''],
      emergency_contact_relationship: [''] // <<< ADDED Relationship Field
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
      // Set conditional validators based on initial role value
      this.updateConditionalValidators(this.registerForm.get('role')?.value ?? 'PATIENT');
      // Update validators when role changes
      this.registerForm.get('role')?.valueChanges.subscribe(role => {
          if(role) this.updateConditionalValidators(role);
      });
  }


  updateConditionalValidators(role: string) {
    const specializationControl = this.registerForm.get('specialization');
    const licenseControl = this.registerForm.get('license_number');

    // Add REQUIRED validators for profile fields regardless of role
    this.registerForm.get('phone_number')?.setValidators([Validators.required]);
    this.registerForm.get('address')?.setValidators([Validators.required]);
    this.registerForm.get('date_of_birth')?.setValidators([Validators.required]);

    // Conditional for Doctor
    if (role === 'DOCTOR') {
      specializationControl?.setValidators([Validators.required]);
      licenseControl?.setValidators([Validators.required]);
    } else {
      specializationControl?.clearValidators();
      licenseControl?.clearValidators();
    }

    // Update validity for all potentially changed fields
    specializationControl?.updateValueAndValidity();
    licenseControl?.updateValueAndValidity();
    this.registerForm.get('phone_number')?.updateValueAndValidity();
    this.registerForm.get('address')?.updateValueAndValidity();
    this.registerForm.get('date_of_birth')?.updateValueAndValidity();
  }

  // Ensure onSubmit works and redirects
  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;
    if (this.registerForm.invalid) {
      console.log("Form Errors:", this.registerForm.errors);
      console.log("Form Controls:", this.registerForm.controls);
      this.registerForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;

    // **IMPORTANT**: Adjust payload based on how backend expects relationship field
    // Assuming it's just another field alongside emergency contact
    const formData = this.registerForm.value;

    this.authService.register(formData) // Send the whole form value
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          console.log('Registration successful:', response);
          this.successMessage = 'Account created successfully! Redirecting to login...'; // Updated message
          setTimeout(() => {
            this.router.navigate(['/login']); // Redirect to Login
          }, 2500);
          // Don't reset form here, let navigation happen
        },
        error: (err) => { /* ... error handling ... */ }
      });
  }

  // Getters
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
  // Add getters for optional fields if needed for validation messages
}