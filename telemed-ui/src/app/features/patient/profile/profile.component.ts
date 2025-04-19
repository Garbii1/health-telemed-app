// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, etc.
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms'; // For reactive forms
import { ApiService } from '../../../core/services/api.service'; // Service to interact with backend
import { AuthService } from '../../../core/services/auth.service'; // Service for auth state (optional here, maybe for refresh)
import { finalize, Subject, of } from 'rxjs'; // RxJS utilities
import { catchError, takeUntil, tap } from 'rxjs/operators'; // RxJS operators
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // Standalone spinner

@Component({
  selector: 'app-patient-profile', // Component selector used in routing/templates
  standalone: true, // Mark component as standalone
  imports: [ // Import necessary modules/components for the template
    CommonModule, // Provides *ngIf, *ngFor, async pipe, etc.
    ReactiveFormsModule, // Provides formGroup, formControlName, etc.
    LoadingSpinnerComponent // Import the standalone spinner component
  ],
  templateUrl: './profile.component.html', // Link to the HTML template
  styleUrls: ['./profile.component.scss'] // Link to the SCSS stylesheet
})
export class PatientProfileComponent implements OnInit, OnDestroy {
  // --- Component Properties ---
  profileForm: FormGroup; // The main form group for the profile data
  isLoading = true; // Flag to control loading state (shows spinner)
  isSaving = false; // Flag to control save button loading state
  errorMessage: string | null = null; // Holds error messages for display
  successMessage: string | null = null; // Holds success messages for display
  initialProfileData: any = null; // Holds the initially loaded profile data (used by *ngIf in template)
  private destroy$ = new Subject<void>(); // Subject to manage observable unsubscriptions

  constructor(
    private fb: FormBuilder, // Inject Angular's FormBuilder service
    private apiService: ApiService, // Inject custom API service
    private authService: AuthService, // Inject AuthService (optional, e.g., for updating global state)
    private cdRef: ChangeDetectorRef // Inject ChangeDetectorRef for manual UI updates if needed
  ) {
    // Initialize the form structure in the constructor to ensure it exists before ngOnInit
    this.profileForm = this.fb.group({
      // Username field - usually read-only, value patched from API, control disabled
      username: [{value: '', disabled: true}],
      // Nested group for user fields that can be updated
      user_update: this.fb.group({
          email: ['', [Validators.required, Validators.email]], // Email is required and must be valid format
          first_name: ['', Validators.required], // First name is required
          last_name: ['', Validators.required]  // Last name is required
      }),
      // Direct profile fields - all are required
      phone_number: ['', Validators.required],
      address: ['', Validators.required],
      date_of_birth: ['', Validators.required],
      // Nested group for patient-specific fields that can be updated
      patient_details_update: this.fb.group({
        emergency_contact_name: [''], // Optional
        emergency_contact_phone: [''], // Optional
        emergency_contact_relationship: [''] // Optional
      })
    });
  }

  // --- Lifecycle Hooks ---
  ngOnInit(): void {
    console.log("PatientProfile OnInit: Component initialized.");
    this.loadProfile(); // Fetch profile data when the component loads
  }

  ngOnDestroy(): void {
      console.log("PatientProfile OnDestroy: Cleaning up subscriptions.");
      this.destroy$.next(); // Signal observers to complete
      this.destroy$.complete(); // Complete the subject
  }

  // --- Data Loading Method ---
  loadProfile(): void {
    console.log("loadProfile: Fetching profile data...");
    this.isLoading = true; // Show loading indicator
    this.errorMessage = null; // Clear previous errors
    this.successMessage = null;
    // Resetting the form before patching ensures clean state, especially on retry
    this.profileForm.reset({ username: this.profileForm.get('username')?.value }); // Reset, keeping disabled username value
    this.profileForm.get('username')?.disable(); // Re-disable after reset
    this.cdRef.detectChanges(); // Trigger change detection to show spinner

    this.apiService.getProfile().pipe(
        tap(profile => console.log("API SUCCESS: Profile data received:", profile)), // Log successful fetch
        catchError(err => { // Handle errors during the API call
            console.error("API CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load your profile data. Please try again later.";
            this.initialProfileData = null; // Ensure form doesn't render if data load failed
            return of(null); // Return a null observable so the stream completes
        }),
        finalize(() => { // This block *always* runs after success or error
            console.log("API FINALIZE: Setting isLoading = false");
            this.isLoading = false; // Hide loading indicator
            this.cdRef.detectChanges(); // Update the view to reflect loading state change
        }),
        takeUntil(this.destroy$) // Unsubscribe automatically when component is destroyed
    ).subscribe({
        next: (profile) => {
          // Only process if profile data was successfully fetched (not null from catchError)
          if (profile) {
              this.initialProfileData = profile; // Set flag for template *ngIf
              this.patchForm(profile); // Populate the form with the fetched data
              this.profileForm.markAsPristine(); // Mark form as not dirty initially
              this.profileForm.markAsUntouched(); // Mark controls as untouched initially
              console.log("Profile form patched and marked pristine/untouched.");
          } else {
              // Error occurred, message already set in catchError
              console.log("Profile data processing skipped due to earlier error.");
          }
        }
        // Error handled in catchError
    });
  }

  // --- Helper Methods ---

  // Patches the form with data received from the API, handling nested groups
  private patchForm(profile: any): void {
       console.log("Patching form with data:", profile);
       // Patch top-level fields first (handle potential null values from API)
       this.profileForm.patchValue({
         username: profile.user?.username ?? '', // Patch disabled field value for display
         phone_number: profile.phone_number ?? '',
         address: profile.address ?? '',
         date_of_birth: this.formatDateForInput(profile.date_of_birth), // Use helper for date format
       }, { emitEvent: false }); // Prevent immediate valueChanges triggers

       // Patch nested user_update group safely
       const userUpdateGroup = this.profileForm.get('user_update');
       if (userUpdateGroup && profile.user) {
           userUpdateGroup.patchValue({
               email: profile.user.email ?? '',
               first_name: profile.user.first_name ?? '',
               last_name: profile.user.last_name ?? '',
           }, { emitEvent: false });
       } else { console.warn("User data missing or form group 'user_update' not found for patching."); }

       // Patch nested patient_details_update group safely
       // Assumes backend sends patient specific details under a 'details' key via get_details method
       const patientDetailsGroup = this.profileForm.get('patient_details_update');
       if (patientDetailsGroup && profile.details) {
           patientDetailsGroup.patchValue({
               emergency_contact_name: profile.details.emergency_contact_name || '',
               emergency_contact_phone: profile.details.emergency_contact_phone || '',
               emergency_contact_relationship: profile.details.emergency_contact_relationship || ''
           }, { emitEvent: false });
       } else { console.warn("Patient details missing or form group 'patient_details_update' not found for patching."); }

       console.log('Form value AFTER patch:', this.profileForm.getRawValue());
  }

   // Formats a date string (or null) into 'YYYY-MM-DD' for the date input control
   formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null;
     try {
       const date = new Date(dateStr);
       if (isNaN(date.getTime())) return null; // Check for invalid date object
       const year = date.getFullYear();
       const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
       const day = date.getDate().toString().padStart(2, '0');
       return `${year}-${month}-${day}`;
     } catch (e) {
         console.error("Error formatting date:", dateStr, e);
         return null; // Return null on error
     }
   }

   // Debugging method attached to the button's (click) event
   onSaveButtonClick() {
       console.log('SAVE CHANGES BUTTON CLICKED!');
       console.log('Form valid on button click?', this.profileForm.valid);
       console.log('Form dirty on button click?', this.profileForm.dirty);
   }

  // --- Form Submission ---
  onSubmit(): void {
    console.log("Profile onSubmit CALLED");
    this.errorMessage = null; this.successMessage = null; // Clear messages

    // Mark all controls as touched to trigger validation messages display
    this.profileForm.markAllAsTouched();

    // Log detailed validity state if invalid
    if (this.profileForm.invalid) {
      console.error("Profile Form IS INVALID. Halting submission.");
      this.logFormErrors(this.profileForm); // Log specific errors
      this.errorMessage = "Please correct the errors highlighted in the form.";
      this.cdRef.detectChanges();
      return;
    }

    // Check if any changes were actually made to the form
    if (!this.profileForm.dirty) {
        console.warn("No changes detected in profile form (form not dirty). Nothing to save.");
        this.successMessage = "No changes were made to save.";
        this.cdRef.detectChanges();
        setTimeout(() => this.successMessage = null, 3000); // Message disappears after 3s
        return;
      }

    // Proceed if form is valid and dirty
    console.log("Profile form is valid and dirty. Proceeding with API update...");
    this.isSaving = true; // Show saving indicator on button
    this.cdRef.detectChanges();

    // Construct payload matching the backend UserProfileSerializer write_only fields structure
    const rawValue = this.profileForm.getRawValue(); // Includes values from disabled controls if needed by backend
    const profileDataPayload = {
        // Direct profile fields
        phone_number: rawValue.phone_number,
        address: rawValue.address,
        date_of_birth: rawValue.date_of_birth,
        // Nested update objects
        user_update: rawValue.user_update,
        patient_details_update: rawValue.patient_details_update
    };

    console.log("Submitting updated profile data payload:", profileDataPayload);

    // Call the API service to update the profile
    this.apiService.updateProfile(profileDataPayload)
      .pipe(
          finalize(() => { // Runs after success or error
              this.isSaving = false; // Hide saving indicator
              this.cdRef.detectChanges(); // Update button state
              console.log("updateProfile API call finalized.");
          }),
          takeUntil(this.destroy$) // Auto-unsubscribe
      )
      .subscribe({
        next: (updatedProfile) => { // Handle successful update
          console.log("Profile update SUCCESSFUL:", updatedProfile);
          this.successMessage = "Profile updated successfully!";
           this.patchForm(updatedProfile); // Update form with response data
           this.profileForm.markAsPristine(); // Reset dirty state after successful save
           this.cdRef.detectChanges(); // Ensure success message shows
           setTimeout(() => this.successMessage = null, 4000); // Hide message after 4s
           // Optionally refresh global auth state if needed
           // this.authService.fetchAndSetUserProfile().subscribe();
        },
        error: (err) => { // Handle errors during update
          console.error("Error updating profile API call:", err);
          // Parse backend error messages for user display
           if (err.error && typeof err.error === 'object') {
              let backendErrors = '';
              const parseErrors = (errors: any, prefix = '') => {
                  for (const key in errors) {
                      if (errors.hasOwnProperty(key)) {
                         const messages = Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key];
                         // Format key for readability
                         const formattedKey = prefix + key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                         backendErrors += `- ${formattedKey}: ${messages}\n`;
                      }
                  }
              }
              parseErrors(err.error.user_update, 'Account - ');
              parseErrors(err.error.patient_details_update, 'Emergency Contact - ');
              parseErrors(err.error); // Handle root level errors last

              this.errorMessage = `Update failed:\n${backendErrors.trim() || 'Please check your input and try again.'}`;

           } else if (err.error?.detail) { this.errorMessage = err.error.detail; }
           else if(err.message) { this.errorMessage = `Update failed: ${err.message}`; }
           else { this.errorMessage = "Failed to update profile due to an unexpected error."; }
           this.cdRef.detectChanges(); // Ensure error message shows
        }
      });
  }

   // --- Getters for Template Access ---
   // Provides convenient access to form controls in the HTML template
   get email(): AbstractControl | null { return this.profileForm.get('user_update.email'); }
   get first_name(): AbstractControl | null { return this.profileForm.get('user_update.first_name'); }
   get last_name(): AbstractControl | null { return this.profileForm.get('user_update.last_name'); }
   get phone_number(): AbstractControl | null { return this.profileForm.get('phone_number'); }
   get address(): AbstractControl | null { return this.profileForm.get('address'); }
   get date_of_birth(): AbstractControl | null { return this.profileForm.get('date_of_birth'); }
   get emergency_contact_name(): AbstractControl | null { return this.profileForm.get('patient_details_update.emergency_contact_name'); }
   get emergency_contact_phone(): AbstractControl | null { return this.profileForm.get('patient_details_update.emergency_contact_phone'); }
   get emergency_contact_relationship(): AbstractControl | null { return this.profileForm.get('patient_details_update.emergency_contact_relationship'); }

   // Helper function to log form errors recursively (for debugging)
   private logFormErrors(group: FormGroup | AbstractControl | null, prefix = ''): void {
       if (!group) return;
       Object.keys(group.errors || {}).forEach(errorKey => {
           console.error(`${prefix}Form Group Error: ${errorKey}`);
       });

       if (group instanceof FormGroup) {
           Object.keys(group.controls).forEach(key => {
               const control = group.get(key);
               if (control?.invalid) {
                    console.error(`${prefix}Control '${key}': Status=${control?.status}, Errors=${JSON.stringify(control?.errors)}`);
               }
               if (control instanceof FormGroup) {
                    this.logFormErrors(control, `${prefix}${key}.`); // Recurse for nested groups
               }
           });
       }
   }
}