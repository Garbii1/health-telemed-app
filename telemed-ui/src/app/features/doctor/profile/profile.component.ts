// features/doctor/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service'; // To potentially update local user info
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-doctor-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class DoctorProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  initialProfileData: any = null; // Store initial data to compare changes

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService // Inject AuthService if needed
  ) {
    this.profileForm = this.fb.group({
      // Fields from User model (read-only usually, or subset editable)
      username: [{value: '', disabled: true}], // Typically username is not changed
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      // Fields from UserProfile model
      phone_number: [''],
      address: [''],
      date_of_birth: [''],
      // Fields from DoctorProfile model (fetched separately or combined in backend serializer)
      // Assuming backend profile endpoint returns nested doctor details
      doctor_details: this.fb.group({
          specialization: ['', Validators.required],
          years_of_experience: [0, [Validators.min(0)]],
          license_number: [{value: '', disabled: true}] // License likely not editable
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
          console.log("Profile data received:", profile);
          this.initialProfileData = profile; // Store initial state
          // Patch form values, including nested group
           this.profileForm.patchValue({
             username: profile.user.username,
             email: profile.user.email,
             first_name: profile.user.first_name,
             last_name: profile.user.last_name,
             phone_number: profile.phone_number,
             address: profile.address,
             // Format date for input type="date" (YYYY-MM-DD)
             date_of_birth: this.formatDateForInput(profile.date_of_birth),
             doctor_details: {
                specialization: profile.doctor_details?.specialization || '',
                years_of_experience: profile.doctor_details?.years_of_experience || 0,
                license_number: profile.doctor_details?.license_number || 'N/A'
              }
           });
           // Check if form is dirty after patching (shouldn't be)
           // console.log("Form dirty after patch?", this.profileForm.dirty);
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
       // Ensure date is valid before formatting
       if (isNaN(date.getTime())) return null;
       // Format to YYYY-MM-DD
       const year = date.getFullYear();
       const month = (date.getMonth() + 1).toString().padStart(2, '0');
       const day = date.getDate().toString().padStart(2, '0');
       return `${year}-${month}-${day}`;
     } catch (e) {
       console.error("Error formatting date:", e);
       return null;
     }
   }

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    // Check if anything actually changed (optional, prevents unnecessary saves)
    // This requires careful comparison, especially with nested objects/dates
    // For simplicity, we'll just save if the form is valid.

    this.isSaving = true;

    // Prepare data payload matching backend expectations
    // Usually, profile update expects the fields of UserProfile serializer
     const profileData = {
        // Include fields from UserProfile model that are editable
        phone_number: this.profileForm.value.phone_number,
        address: this.profileForm.value.address,
        date_of_birth: this.profileForm.value.date_of_birth,
        // Include basic user fields if your endpoint allows updating them via profile
        // (Requires custom UserSerializer and update logic in backend view)
         user: {
              email: this.profileForm.value.email,
              first_name: this.profileForm.value.first_name,
              last_name: this.profileForm.value.last_name,
         },
         // Include doctor-specific fields if your endpoint handles nested updates
         // (Requires custom logic or nested serializer support in backend)
         doctor_details: {
              specialization: this.profileForm.get('doctor_details.specialization')?.value,
              years_of_experience: this.profileForm.get('doctor_details.years_of_experience')?.value
          }
         // NOTE: Backend needs adjustment to handle nested user/doctor_details updates via profile endpoint
         // OR create separate endpoints to update user details / doctor specifics.
         // For now, assume the backend PUT /api/profile/ expects this structure.
     };

    // Adjust the payload based on your backend API structure for profile update (PUT/PATCH)
    // Let's assume a PUT request expects the editable UserProfile fields + nested doctor details
    // A simpler approach might be to only send UserProfile fields and have separate endpoints
    // for User and DoctorProfile specifics if needed.
    // Let's modify the payload to *only* send profile fields + doctor details, assuming user details update isn't handled here.
     const simplifiedPayload = {
         phone_number: this.profileForm.value.phone_number,
         address: this.profileForm.value.address,
         date_of_birth: this.profileForm.value.date_of_birth,
         // Assuming the backend can handle nested updates for doctor_details on the profile endpoint
         doctor_details: this.profileForm.get('doctor_details')?.value
         // You might need separate calls if backend doesn't support nested updates:
         // 1. PUT /api/profile/ with UserProfile fields
         // 2. PUT /api/doctor-details/{id}/ with DoctorProfile fields
     };


    this.apiService.updateProfile(simplifiedPayload) // Use the correct payload structure
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (updatedProfile) => {
          this.successMessage = "Profile updated successfully!";
           this.initialProfileData = updatedProfile; // Update initial data state
           this.profileForm.markAsPristine(); // Reset dirty state
          // Optionally update local user info in AuthService if needed
           // this.authService.fetchAndSetUserProfile(); // Re-fetch profile data
           setTimeout(() => this.successMessage = null, 3000);
        },
        error: (err) => {
          console.error("Error updating profile:", err);
          this.errorMessage = err.error?.detail || "Failed to update profile.";
          // Display specific field errors if available from backend
          // e.g., if (err.error.email) { this.profileForm.get('email')?.setErrors(...) }
        }
      });
  }

   // Getters for easier template access
   get email() { return this.profileForm.get('email'); }
   get first_name() { return this.profileForm.get('first_name'); }
   get last_name() { return this.profileForm.get('last_name'); }
   get specialization() { return this.profileForm.get('doctor_details.specialization'); }
   get years_of_experience() { return this.profileForm.get('doctor_details.years_of_experience'); }

}