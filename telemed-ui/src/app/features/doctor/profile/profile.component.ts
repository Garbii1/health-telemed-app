// src/app/features/doctor/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-doctor-profile',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class DoctorProfileComponent implements OnInit {
  // Fix: Initialize FormGroup
  profileForm: FormGroup = this.fb.group({ /* ... form controls ... */ });
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  initialProfileData: any = null;

  constructor( private fb: FormBuilder, private apiService: ApiService ) {
     // Move initialization to declaration or ensure assignment here
     this.profileForm = this.fb.group({ username: [{value: '', disabled: true}], email: ['', [Validators.required, Validators.email]], first_name: ['', Validators.required], last_name: ['', Validators.required], phone_number: [''], address: [''], date_of_birth: [''], doctor_details: this.fb.group({ specialization: ['', Validators.required], years_of_experience: [0, [Validators.required, Validators.min(0)]], license_number: [{value: '', disabled: true}] }) });
  }

  ngOnInit(): void { this.loadProfile(); }
  loadProfile(): void { /* ... */ }

  // Fix: Ensure return type
  formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null; try { const date = new Date(dateStr); if (isNaN(date.getTime())) return null; const year = date.getFullYear(); const month = (date.getMonth() + 1).toString().padStart(2, '0'); const day = date.getDate().toString().padStart(2, '0'); return `${year}-${month}-${day}`; } catch (e) { return null; }
  }

  onSubmit(): void { /* ... */ }
  get email() { return this.profileForm.get('email'); }
  get first_name() { return this.profileForm.get('first_name'); }
  get last_name() { return this.profileForm.get('last_name'); }
  get specialization() { return this.profileForm.get('doctor_details.specialization'); }
  get years_of_experience() { return this.profileForm.get('doctor_details.years_of_experience'); }
}