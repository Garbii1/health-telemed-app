// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <<< ADDED: For *ngIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // <<< ADDED: For forms
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // <<< ADDED

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, // <<< ADDED
    LoadingSpinnerComponent // <<< ADDED
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class PatientProfileComponent implements OnInit {
  // Fix: Initialize FormGroup immediately
  profileForm: FormGroup = this.fb.group({
      username: [{value: '', disabled: true}],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phone_number: [''],
      address: [''],
      date_of_birth: [''],
      patient_details: this.fb.group({
        emergency_contact_name: [''],
        emergency_contact_phone: ['']
      })
  });
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  initialProfileData: any = null;

  constructor(
    private fb: FormBuilder, // Inject FormBuilder
    private apiService: ApiService
  ) {
    // Initialization moved to declaration
  }

  ngOnInit(): void { this.loadProfile(); }

  loadProfile(): void {
    // ... (loadProfile logic remains the same) ...
     this.isLoading = true; this.errorMessage = null; this.apiService.getProfile().pipe(finalize(() => this.isLoading = false)).subscribe({ next: (profile) => { /* patch value */ this.profileForm.markAsPristine(); }, error: (err) => { /* handle error */ } });
  }

  formatDateForInput(dateStr: string | null): string | null {
    // Fix: Ensure return value
    if (!dateStr) return null; try { const date = new Date(dateStr); if (isNaN(date.getTime())) return null; const year = date.getFullYear(); const month = (date.getMonth() + 1).toString().padStart(2, '0'); const day = date.getDate().toString().padStart(2, '0'); return `${year}-${month}-${day}`; } catch (e) { return null; }
  }

  onSubmit(): void {
    // ... (onSubmit logic remains the same) ...
     this.errorMessage = null; this.successMessage = null; if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; } if (!this.profileForm.dirty) { /* ... */ return; } this.isSaving = true; const simplifiedPayload = { /* ... */ }; this.apiService.updateProfile(simplifiedPayload).pipe(finalize(() => this.isSaving = false)).subscribe({ next: (updatedProfile) => { /* ... */ }, error: (err) => { /* ... */ } });
  }

   // Fix: Add correct getters for template access
   get email() { return this.profileForm.get('email'); }
   get first_name() { return this.profileForm.get('first_name'); }
   get last_name() { return this.profileForm.get('last_name'); }
   get emergency_contact_name() { return this.profileForm.get('patient_details.emergency_contact_name'); }
   get emergency_contact_phone() { return this.profileForm.get('patient_details.emergency_contact_phone'); }
}