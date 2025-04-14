// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule, LoadingSpinnerComponent ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class PatientProfileComponent implements OnInit {
  // Fix: Initialize FormGroup
  profileForm: FormGroup = this.fb.group({ /* ... controls ... */ });
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  initialProfileData: any = null;

  constructor( private fb: FormBuilder, private apiService: ApiService ) {
     // Initialize form in declaration or here
     this.profileForm = this.fb.group({ username: [{value: '', disabled: true}], email: ['', [Validators.required, Validators.email]], first_name: ['', Validators.required], last_name: ['', Validators.required], phone_number: [''], address: [''], date_of_birth: [''], patient_details: this.fb.group({ emergency_contact_name: [''], emergency_contact_phone: [''] }) });
  }

  ngOnInit(): void { this.loadProfile(); }
  loadProfile(): void { /* ... */ }

  // Fix: Ensure return value
  formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null; try { const date = new Date(dateStr); if (isNaN(date.getTime())) return null; const year = date.getFullYear(); const month = (date.getMonth() + 1).toString().padStart(2, '0'); const day = date.getDate().toString().padStart(2, '0'); return `${year}-${month}-${day}`; } catch (e) { return null; }
  }

  onSubmit(): void { /* ... */ }

   // Fix: Add getters needed by template
   get email() { return this.profileForm.get('email'); }
   get first_name() { return this.profileForm.get('first_name'); }
   get last_name() { return this.profileForm.get('last_name'); }
   get emergency_contact_name() { return this.profileForm.get('patient_details.emergency_contact_name'); }
   get emergency_contact_phone() { return this.profileForm.get('patient_details.emergency_contact_phone'); }
}