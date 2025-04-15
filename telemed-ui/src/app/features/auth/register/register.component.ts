// src/app/features/auth/register/register.component.ts
import { Component, OnInit } from '@angular/core';
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
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Initialize with NEW structure and validators
    this.registerForm = this.fb.group({
      role: ['PATIENT', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', Validators.required],
      phone_number: ['', Validators.required], // Required
      address: ['', Validators.required],       // Required
      date_of_birth: ['', Validators.required], // Required
      specialization: [''],
      license_number: [''],
      emergency_contact_name: [''],
      emergency_contact_phone: [''],
      emergency_contact_relationship: [''] // Added
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
      this.updateConditionalValidators(this.registerForm.get('role')?.value ?? 'PATIENT');
      this.registerForm.get('role')?.valueChanges.subscribe(role => {
          if(role) this.updateConditionalValidators(role);
      });
  }

  updateConditionalValidators(role: string) {
    const specializationControl = this.registerForm.get('specialization');
    const licenseControl = this.registerForm.get('license_number');

    // Phone, Address, DOB are always required now (validators set at init)

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

  // Ensure onSubmit logic is present and correct
  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;
    if (this.registerForm.invalid) {
      console.log("Register Form Invalid. Errors:", this.registerForm.errors);
      console.log("Controls:", this.registerForm.controls);
      this.registerForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    const formData = this.registerForm.value;
    // **Backend Check**: Ensure your backend /register/ serializer handles
    // 'emergency_contact_relationship' if it's sent for Patients.
    // If not, you might need to conditionally remove it from formData before sending.

    this.authService.register(formData)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          console.log('Registration successful:', response);
          this.successMessage = 'Account created successfully! Redirecting to login...';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2500);
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
  // Add getters for optional fields if needed
}