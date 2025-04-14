// src/app/features/auth/register/register.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms'; // For forms
import { Router, RouterLink } from '@angular/router'; // For routerLink
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null { /* ... */ }

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,          // <<< Needed for *ngIf
    ReactiveFormsModule,   // <<< Needed for [formGroup], formControlName
    RouterLink             // <<< Needed for routerLink
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  // ... (rest of component code is correct from previous version) ...
  registerForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  constructor( private fb: FormBuilder, private authService: AuthService, private router: Router ) { /* ... form init ... */ }
  updateConditionalValidators(role: string) { /* ... */ }
  onSubmit(): void { /* ... */ }
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