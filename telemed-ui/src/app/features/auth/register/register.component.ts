// src/app/features/auth/register/register.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

// Fix: Ensure function explicitly returns ValidationErrors | null
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const password2 = control.get('password2');
  if (password && password2 && password.value !== password2.value) {
    return { passwordMismatch: true };
  }
  return null; // <<< Explicitly return null
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule, RouterLink ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  // Fix: Declare type but initialize in constructor
  registerForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder, // Inject FormBuilder
    private authService: AuthService,
    private router: Router
  ) {
    // Initialize here
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
          if(role) this.updateConditionalValidators(role); // Add null check for safety
     });
     this.updateConditionalValidators(this.registerForm.get('role')?.value ?? 'PATIENT'); // Initial check with default
  }

  updateConditionalValidators(role: string) { /* ... remains same ... */ }
  onSubmit(): void { /* ... remains same ... */ }

   // Getters are fine
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