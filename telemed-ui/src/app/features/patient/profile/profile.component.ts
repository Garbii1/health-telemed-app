// features/patient/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-patient-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class PatientProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  initialProfileData: any = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService
  ) {
    this.profileForm = this.fb.group({
      // User fields (consider making username/email read-only depending on backend)
      username: [{value: '', disabled: true}],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      // UserProfile fields
      phone_number: [''],
      address: [''],
      date_of_birth: [''],
      // PatientProfile specific fields (nested group for clarity)
      patient_details: this.fb.group({
        emergency_contact_name: [''],
        emergency_contact_phone: ['']
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
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (profile) => {
          console.log("Patient Profile data received:", profile);
          this.initialProfileData = profile;
           this.profileForm.patchValue({
             username: profile.user.username,
             email: profile.user.email,
             first_name: profile.user.first_name,
             last_name: profile.user.last_name,
             phone_number: profile.phone_number,
             address: profile.address,
             date_of_birth: this.formatDateForInput(profile.date_of_birth),
             patient_details: { // Patch nested group
                emergency_contact_name: profile.patient_details?.emergency_contact_name || '',
                emergency_contact_phone: profile.patient_details?.emergency_contact_phone || ''
              }
           });
        },
        error: (err) => {
          console.error("Error loading profile:", err);
          this.errorMessage = "Failed to load profile data.";
        }
      });
  }

   // Helper to format date string (YYYY-MM-DD) for date input
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

    // Only save if changes were made
    if (!this.profileForm.dirty) {
        this.successMessage = "No changes detected.";
        setTimeout(() => this.successMessage = null, 3000);
        return;
      }

    this.isSaving = true;

    // Prepare payload - adjust based on backend serializer expectations
    // Assume backend handles nested patient_details update via the main profile endpoint
     const profileData = {
        // Editable UserProfile fields
        phone_number: this.profileForm.value.phone_number,
        address: this.profileForm.value.address,
        date_of_birth: this.profileForm.value.date_of_birth,
        // Editable User fields (if backend supports updating them via profile)
        user: {
             email: this.profileForm.value.email,
             first_name: this.profileForm.value.first_name,
             last_name: this.profileForm.value.last_name,
        },
        // Editable PatientProfile fields (nested)
        patient_details: this.profileForm.get('patient_details')?.value
     };

     // **IMPORTANT**: If your backend doesn't handle nested updates for 'user' or 'patient_details'
     // via the main '/api/profile/' endpoint, you'll need to adjust the payload and possibly
     // make separate API calls to update user details or patient details.
     // Let's simplify the payload assuming only UserProfile and PatientProfile fields are sent:
      const simplifiedPayload = {
          phone_number: this.profileForm.value.phone_number,
          address: this.profileForm.value.address,
          date_of_birth: this.profileForm.value.date_of_birth,
          patient_details: this.profileForm.get('patient_details')?.value
          // We might need to send user fields separately if required by backend
      };

    this.apiService.updateProfile(simplifiedPayload) // Use appropriate payload
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (updatedProfile) => {
          this.successMessage = "Profile updated successfully!";
           this.initialProfileData = updatedProfile;
           this.profileForm.markAsPristine(); // Reset dirty state
           setTimeout(() => this.successMessage = null, 3000);
        },
        error: (err) => {
          console.error("Error updating profile:", err);
          this.errorMessage = err.error?.detail || "Failed to update profile.";
        }
      });
  }

   // --- Getters for template validation ---
   get email() { return this.profileForm.get('email'); }
   get first_name() { return this.profileForm.get('first_name'); }
   get last_name() { return this.profileForm.get('last_name'); }
   get emergency_contact_name() { return this.profileForm.get('patient_details.emergency_contact_name'); }
   get emergency_contact_phone() { return this.profileForm.get('patient_details.emergency_contact_phone'); }
}