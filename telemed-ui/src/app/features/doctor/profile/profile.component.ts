// src/app/features/doctor/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <<< ADDED: For *ngIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // <<< ADDED: For forms
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';
// LoadingSpinnerComponent removed - unused warning

@Component({
  selector: 'app-doctor-profile',
  standalone: true,
  imports: [
      CommonModule,
      ReactiveFormsModule,
      // LoadingSpinnerComponent // Removed - unused
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class DoctorProfileComponent implements OnInit {
  // ... (Rest of component code is correct from previous version) ...
  profileForm: FormGroup;
  isLoading = true; isSaving = false; errorMessage: string | null = null; successMessage: string | null = null; initialProfileData: any = null;
  constructor( private fb: FormBuilder, private apiService: ApiService ) { /* ... form init ... */ }
  ngOnInit(): void { this.loadProfile(); }
  loadProfile(): void { /* ... */ }
  formatDateForInput(dateStr: string | null): string | null { /* ... */ }
  onSubmit(): void { /* ... */ }
  get email() { return this.profileForm.get('email'); }
  get first_name() { return this.profileForm.get('first_name'); }
  get last_name() { return this.profileForm.get('last_name'); }
  get specialization() { return this.profileForm.get('doctor_details.specialization'); }
  get years_of_experience() { return this.profileForm.get('doctor_details.years_of_experience'); }
}