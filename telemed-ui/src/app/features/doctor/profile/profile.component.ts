// src/app/features/doctor/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // For forms
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // Import spinner

@Component({
  selector: 'app-doctor-profile',
  standalone: true, // Add standalone
  imports: [
      CommonModule, // For *ngIf
      ReactiveFormsModule, // For [formGroup], formControlName
      LoadingSpinnerComponent // Import child component
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class DoctorProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading = true; // Start loading true
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  initialProfileData: any = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
  ) {
    this.profileForm = this.fb.group({
      username: [{value: '', disabled: true}],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phone_number: [''],
      address: [''],
      date_of_birth: [''],
      doctor_details: this.fb.group({
          specialization: ['', Validators.required],
          years_of_experience: [0, [Validators.required, Validators.min(0)]], // Added required
          license_number: [{value: '', disabled: true}]
      })
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.apiService.getProfile()
      .pipe(finalize(() => this.isLoading = false)) // Set loading false on complete/error
      .subscribe({
        next: (profile) => {
          this.initialProfileData = profile;
           this.profileForm.patchValue({
             username: profile.user.username,
             email: profile.user.email,
             first_name: profile.user.first_name,
             last_name: profile.user.last_name,
             phone_number: profile.phone_number,
             address: profile.address,
             date_of_birth: this.formatDateForInput(profile.date_of_birth),
             doctor_details: {
                specialization: profile.doctor_details?.specialization || '',
                years_of_experience: profile.doctor_details?.years_of_experience ?? 0, // Handle null
                license_number: profile.doctor_details?.license_number || 'N/A'
              }
           });
           this.profileForm.markAsPristine(); // Mark as pristine after load
        },
        error: (err) => {
          console.error("Error loading profile:", err);
          this.errorMessage = "Failed to load profile data.";
        }
      });
  }

   formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null;
     try {
       const date = new Date(dateStr);
       if (isNaN(date.getTime())) return null;
       const year = date.getFullYear();
       const month = (date.getMonth() + 1).toString().padStart(2, '0');
       const day = date.getDate().toString().padStart(2, '0');
       return `${year}-${month}-${day}`;
     } catch (e) { return null; }
   }

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    if (!this.profileForm.dirty) {
        this.successMessage = "No changes detected.";
        setTimeout(() => this.successMessage = null, 3000);
        return;
      }

    this.isSaving = true;
     // Prepare payload based on simplified approach (UserProfile + nested doctor_details)
     // Adjust if backend requires separate updates for User model fields
     const simplifiedPayload = {
          phone_number: this.profileForm.value.phone_number,
          address: this.profileForm.value.address,
          date_of_birth: this.profileForm.value.date_of_birth,
          // Include user fields ONLY if backend endpoint handles User model update via profile
          user: {
              email: this.profileForm.get('email')?.value, // Get value even if disabled for display
              first_name: this.profileForm.value.first_name,
              last_name: this.profileForm.value.last_name,
          },
          doctor_details: this.profileForm.get('doctor_details')?.value
     };

    this.apiService.updateProfile(simplifiedPayload)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (updatedProfile) => {
          this.successMessage = "Profile updated successfully!";
           this.initialProfileData = updatedProfile;
           this.profileForm.markAsPristine();
           setTimeout(() => this.successMessage = null, 3000);
        },
        error: (err) => {
          console.error("Error updating profile:", err);
          this.errorMessage = err.error?.detail || "Failed to update profile.";
          // Add logic here to map specific backend field errors to form controls if needed
        }
      });
  }

   get email() { return this.profileForm.get('email'); }
   get first_name() { return this.profileForm.get('first_name'); }
   get last_name() { return this.profileForm.get('last_name'); }
   get specialization() { return this.profileForm.get('doctor_details.specialization'); }
   get years_of_experience() { return this.profileForm.get('doctor_details.years_of_experience'); }

}