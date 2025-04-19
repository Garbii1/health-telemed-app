// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms'; // For forms
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service'; // To potentially update local user info after save
import { finalize, Subject, of } from 'rxjs'; // Import Subject, of
import { catchError, takeUntil, tap } from 'rxjs/operators'; // Import takeUntil, tap, catchError
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // Import spinner

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class PatientProfileComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  isLoading = true; // Start in loading state
  isSaving = false; // Controls save button loading state
  errorMessage: string | null = null;
  successMessage: string | null = null;
  initialProfileData: any = null; // Store initial data to compare changes for 'dirty' check
  private destroy$ = new Subject<void>(); // To manage observable subscriptions

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService, // Inject if needed for refreshing user info after save
    private cdRef: ChangeDetectorRef // Inject for manual change detection
  ) {
    // Initialize the form structure in the constructor
    this.profileForm = this.fb.group({
      // User fields (username often read-only)
      username: [{value: '', disabled: true}],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      // UserProfile fields (now required)
      phone_number: ['', Validators.required],
      address: ['', Validators.required],
      date_of_birth: ['', Validators.required],
      // PatientProfile specific fields (nested group)
      patient_details: this.fb.group({
        emergency_contact_name: [''],
        emergency_contact_phone: [''],
        emergency_contact_relationship: [''] // Added field
      })
    });
  }

  ngOnInit(): void {
    console.log("PatientProfile OnInit");
    this.loadProfile(); // Load profile data when component initializes
  }

  ngOnDestroy(): void {
      console.log("PatientProfile OnDestroy");
      this.destroy$.next(); // Trigger unsubscription
      this.destroy$.complete();
  }

  // Method to fetch profile data from the API
  loadProfile(): void {
    console.log("loadProfile called");
    this.isLoading = true; // Set loading state
    this.errorMessage = null; // Clear previous errors
    this.successMessage = null; // Clear previous success message
    this.cdRef.detectChanges(); // Ensure loading spinner shows

    this.apiService.getProfile().pipe(
        tap(profile => console.log("SUCCESS: Profile data received:", profile)), // Log success
        catchError(err => { // Handle API errors
            console.error("CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load profile data. Please try again.";
            // Let finalize handle isLoading, return null/empty observable
            return of(null);
        }),
        finalize(() => { // <<< Runs on completion or error
            console.log("FINALIZE: Setting isLoading = false");
            this.isLoading = false;
            this.cdRef.detectChanges(); // <<< Update view after loading finishes
        }),
        takeUntil(this.destroy$) // Auto-unsubscribe when component destroyed
    ).subscribe({
        next: (profile) => {
          if (profile) { // Only patch form if data was successfully received
              this.initialProfileData = JSON.parse(JSON.stringify(profile)); // Deep copy for dirty checking later
              // Patch form values, including nested group
               this.profileForm.patchValue({
                 username: profile.user.username,
                 email: profile.user.email,
                 first_name: profile.user.first_name,
                 last_name: profile.user.last_name,
                 phone_number: profile.phone_number,
                 address: profile.address,
                 date_of_birth: this.formatDateForInput(profile.date_of_birth),
                 // Safely patch nested patient details
                 patient_details: {
                    emergency_contact_name: profile.patient_details?.emergency_contact_name || '',
                    emergency_contact_phone: profile.patient_details?.emergency_contact_phone || '',
                    emergency_contact_relationship: profile.patient_details?.emergency_contact_relationship || ''
                  }
               });
               this.profileForm.markAsPristine(); // <<< Mark form as clean after initial load
               console.log("Profile form patched and marked pristine.");
          } else {
              // Error message already set by catchError
              console.log("Profile data was null after API call (likely due to error).");
          }
        }
        // No separate error block needed here if catchError returns 'of(null)'
    });
  }

   // Helper to format date string (YYYY-MM-DD) for date input control
   formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null;
     try {
       const date = new Date(dateStr);
       // Ensure date is valid before formatting
       if (isNaN(date.getTime())) {
           console.warn(`Invalid date string received: ${dateStr}`);
           return null;
       }
       // Format to YYYY-MM-DD required by <input type="date">
       const year = date.getFullYear();
       const month = (date.getMonth() + 1).toString().padStart(2, '0');
       const day = date.getDate().toString().padStart(2, '0');
       return `${year}-${month}-${day}`;
     } catch (e) {
       console.error("Error formatting date:", e);
       return null;
     }
   }

  // Handles form submission to update profile
  onSubmit(): void {
    console.log("Profile onSubmit CALLED");
    this.errorMessage = null; // Clear previous messages
    this.successMessage = null;

    this.profileForm.markAllAsTouched(); // Show validation feedback

    if (this.profileForm.invalid) {
      console.error("Profile Form IS INVALID.");
      this.errorMessage = "Please correct the errors in the form.";
      return;
    }

    // Only save if changes were actually made
    if (!this.profileForm.dirty) {
        console.log("No changes detected in profile form.");
        this.successMessage = "No changes detected.";
        setTimeout(() => this.successMessage = null, 3000);
        return;
      }

    console.log("Profile form is valid and dirty, proceeding with update.");
    this.isSaving = true; // Set saving state for button
    this.cdRef.detectChanges();

    // Prepare payload - getRawValue includes disabled fields (like username if needed by backend)
    // Adjust structure based on backend API expectations for PUT/PATCH /api/profile/
    const profileData = this.profileForm.getRawValue();

    // **Modify payload structure if backend doesn't handle nested 'user' or 'patient_details' automatically**
    // Example: const simplifiedPayload = { phone_number: profileData.phone_number, ... , patient_details: profileData.patient_details };
    // Example: Separate calls might be needed: one for profile, one for user details (email/name) etc.

    console.log("Submitting updated profile data:", profileData);

    this.apiService.updateProfile(profileData) // Assuming backend handles this structure
      .pipe(
          finalize(() => {
              this.isSaving = false; // Reset saving state
              this.cdRef.detectChanges(); // Update button state
              console.log("updateProfile API call finalized.");
          }),
          takeUntil(this.destroy$) // Unsubscribe on destroy
      )
      .subscribe({
        next: (updatedProfile) => {
          console.log("Profile update SUCCESSFUL:", updatedProfile);
          this.successMessage = "Profile updated successfully!";
           this.initialProfileData = JSON.parse(JSON.stringify(updatedProfile)); // Update initial state
           this.profileForm.patchValue(updatedProfile); // Re-patch form with potentially processed data from backend
           this.profileForm.markAsPristine(); // <<< Mark form as clean again after successful save
           // Optionally re-fetch user info in AuthService if name/email changed
           // this.authService.fetchAndSetUserProfile().subscribe();
           setTimeout(() => this.successMessage = null, 4000); // Longer timeout for success
        },
        error: (err) => {
          console.error("Error updating profile:", err);
           if (err.error && typeof err.error === 'object') {
              let backendErrors = '';
              for (const key in err.error) { if (err.error.hasOwnProperty(key)) { const messages = Array.isArray(err.error[key]) ? err.error[key].join(', ') : err.error[key]; backendErrors += `- ${key.replace(/_/g, ' ')}: ${messages}\n`; } }
              this.errorMessage = `Update failed:\n${backendErrors.trim()}`;
           } else if (err.error?.detail) { this.errorMessage = err.error.detail; }
           else if(err.message) { this.errorMessage = `Update failed: ${err.message}`; }
           else { this.errorMessage = "Failed to update profile due to an unexpected error."; }
        }
      });
  }

   // --- Getters for easy template access ---
   get email(): AbstractControl | null { return this.profileForm.get('email'); }
   get first_name(): AbstractControl | null { return this.profileForm.get('first_name'); }
   get last_name(): AbstractControl | null { return this.profileForm.get('last_name'); }
   get phone_number(): AbstractControl | null { return this.profileForm.get('phone_number'); }
   get address(): AbstractControl | null { return this.profileForm.get('address'); }
   get date_of_birth(): AbstractControl | null { return this.profileForm.get('date_of_birth'); }
   // Access nested controls carefully
   get emergency_contact_name(): AbstractControl | null { return this.profileForm.get('patient_details.emergency_contact_name'); }
   get emergency_contact_phone(): AbstractControl | null { return this.profileForm.get('patient_details.emergency_contact_phone'); }
   get emergency_contact_relationship(): AbstractControl | null { return this.profileForm.get('patient_details.emergency_contact_relationship'); }
}