// src/app/features/doctor/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // For forms
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';
// LoadingSpinnerComponent removed as unused

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
  profileForm: FormGroup;
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  initialProfileData: any = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
  ) {
    // ... (Form definition remains the same) ...
    this.profileForm = this.fb.group({ username: [{value: '', disabled: true}], email: ['', [Validators.required, Validators.email]], first_name: ['', Validators.required], last_name: ['', Validators.required], phone_number: [''], address: [''], date_of_birth: [''], doctor_details: this.fb.group({ specialization: ['', Validators.required], years_of_experience: [0, [Validators.required, Validators.min(0)]], license_number: [{value: '', disabled: true}] }) });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    // ... (loadProfile logic remains the same) ...
    this.isLoading = true; this.errorMessage = null; this.apiService.getProfile().pipe(finalize(() => this.isLoading = false)).subscribe({ next: (profile) => { /* patch value */ this.profileForm.markAsPristine(); }, error: (err) => { /* handle error */ } });
  }

   formatDateForInput(dateStr: string | null): string | null {
     // ... (formatDateForInput logic remains the same) ...
        if (!dateStr) return null; try { const date = new Date(dateStr); if (isNaN(date.getTime())) return null; const year = date.getFullYear(); const month = (date.getMonth() + 1).toString().padStart(2, '0'); const day = date.getDate().toString().padStart(2, '0'); return `${year}-${month}-${day}`; } catch (e) { return null; }
   }

  onSubmit(): void {
    // ... (onSubmit logic remains the same) ...
     this.errorMessage = null; this.successMessage = null; if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; } if (!this.profileForm.dirty) { this.successMessage = "No changes detected."; setTimeout(() => this.successMessage = null, 3000); return; } this.isSaving = true; const simplifiedPayload = { phone_number: this.profileForm.value.phone_number, address: this.profileForm.value.address, date_of_birth: this.profileForm.value.date_of_birth, user: { email: this.profileForm.get('email')?.value, first_name: this.profileForm.value.first_name, last_name: this.profileForm.value.last_name, }, doctor_details: this.profileForm.get('doctor_details')?.value }; this.apiService.updateProfile(simplifiedPayload).pipe(finalize(() => this.isSaving = false)).subscribe({ next: (updatedProfile) => { /* handle success */ this.profileForm.markAsPristine(); }, error: (err) => { /* handle error */ } });
  }

   get email() { return this.profileForm.get('email'); }
   get first_name() { return this.profileForm.get('first_name'); }
   get last_name() { return this.profileForm.get('last_name'); }
   get specialization() { return this.profileForm.get('doctor_details.specialization'); }
   get years_of_experience() { return this.profileForm.get('doctor_details.years_of_experience'); }
}