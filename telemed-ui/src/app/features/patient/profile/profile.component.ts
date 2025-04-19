// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, etc.
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms'; // For forms
import { ApiService } from '../../../core/services/api.service'; // Service to interact with backend
import { AuthService } from '../../../core/services/auth.service'; // Optional: For refreshing user info globally
import { finalize, Subject, of } from 'rxjs'; // RxJS utilities
import { catchError, takeUntil, tap } from 'rxjs/operators'; // RxJS operators
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // Standalone spinner

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './profile.component.html', // Link to the HTML template
  styleUrls: ['./profile.component.scss'] // Link to the SCSS stylesheet
})
export class PatientProfileComponent implements OnInit, OnDestroy {
  // --- Component Properties ---
  profileForm: FormGroup; // Declare FormGroup type
  isLoading = true; // Flag for initial data loading state, start true
  isSaving = false; // Flag for save button loading state
  errorMessage: string | null = null; // Holds error messages for display
  successMessage: string | null = null; // Holds success messages for display
  initialProfileData: any = null; // Holds the raw profile data fetched (used by *ngIf in template)
  private destroy$ = new Subject<void>(); // Subject for managing observable unsubscriptions

  constructor(
    private fb: FormBuilder, // Inject FormBuilder service
    private apiService: ApiService, // Inject custom API service
    private authService: AuthService, // Inject Auth service (optional)
    private cdRef: ChangeDetectorRef // Inject ChangeDetectorRef for manual UI updates if needed
  ) {
    // Initialize the form structure in the constructor to ensure it exists before ngOnInit
    this.profileForm = this.fb.group({
      // Username is displayed but not editable
      username: [{value: '', disabled: true}],
      // Nested group for user fields that can be updated
      user_update: this.fb.group({
          email: ['', [Validators.required, Validators.email]],
          first_name: ['', Validators.required],
          last_name: ['', Validators.required]
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
    console.log("loadProfile called");
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.initialProfileData = null; // Ensure *ngIf hides form initially
    this.profileForm.reset({}, { emitEvent: false }); // Reset form silently before loading
    this.profileForm.get('username')?.disable({ emitEvent: false }); // Ensure username stays disabled
    this.cdRef.detectChanges(); // Update view to show loading state

    this.apiService.getProfile().pipe(
        tap(profile => console.log("API Success: Profile data received:", profile)), // Log successful fetch
        catchError(err => { // Handle errors during the API call
            console.error("API CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load your profile data. Please try again later.";
            this.initialProfileData = null; // Keep null on error
            return of(null); // Return a null observable so the stream completes
        }),
        finalize(() => { // This block *always* runs after success or error
            console.log("API FINALIZE: Setting isLoading = false");
            this.isLoading = false; // Hide loading indicator
            this.cdRef.detectChanges(); // Update the view after loading finishes
        }),
        takeUntil(this.destroy$) // Auto-unsubscribe when component is destroyed
    ).subscribe({
        next: (profile) => {
          // Assign data AFTER loading is confirmed false (set in finalize)
          this.initialProfileData = profile; // Assign data for *ngIf check in template

          if (profile) { // Only patch form if data was successfully received
              try {
                this.patchForm(profile); // Populate the form with the fetched data
                this.profileForm.markAsPristine(); // Mark form as not dirty initially
                this.profileForm.markAsUntouched(); // Mark controls as untouched initially
                console.log("Profile form patched and marked pristine/untouched.");
              } catch (patchError) {
                 console.error("ERROR during form patching:", patchError);
                 this.errorMessage = "Error displaying profile data correctly."; // Show user-friendly error
              }
          } else {
              // Error occurred and was handled by catchError
              console.log("Profile data was null after API call (error handled). Form not patched.");
          }
          // Explicitly trigger change detection one last time after all processing in 'next'
          // This might be redundant if finalize already triggered it, but can help ensure view consistency
          this.cdRef.detectChanges();
        },
        error: (err) => {
             // Error handled by catchError, finalize handles isLoading
             console.error("Subscription Error block (should have been caught earlier):", err);
             // this.errorMessage = ...; // Already set in catchError
             // this.isLoading = false; // Handled by finalize
             // this.initialProfileData = null; // Handled by catchError
             // this.cdRef.detectChanges(); // Handled by finalize
        }
    });
  }

  // --- Helper Methods ---

  // Patches the form with data received from the API, handling nested groups defensively
  private patchForm(profile: any): void {
       console.log("Patching form with data:", profile);
       // Patch top-level fields first
       this.profileForm.patchValue({
         username: profile?.user?.username ?? '', // Patch disabled control's value for display
         phone_number: profile?.phone_number ?? '',
         address: profile?.address ?? '',
         date_of_birth: this.formatDateForInput(profile?.date_of_birth), // Use helper for date format
       }, { emitEvent: false }); // Prevent valueChanges triggers during patch

       // Patch nested user_update group defensively
       const userUpdateGroup = this.profileForm.get('user_update') as FormGroup;
       if (userUpdateGroup && profile?.user) {
           console.log("Patching user_update:", profile.user);
           userUpdateGroup.patchValue({
               email: profile.user.email ?? '',
               first_name: profile.user.first_name ?? '',
               last_name: profile.user.last_name ?? '',
           }, { emitEvent: false });
       } else { console.warn("User data/group missing for user_update patch."); }

       // Patch nested patient_details_update group defensively
       // Check both potential keys ('patient_details' direct from model, 'details' from SerializerMethodField)
       const patientDetailsGroup = this.profileForm.get('patient_details_update') as FormGroup;
       const patientDetailsData = profile?.patient_details ?? profile?.details;

       if (patientDetailsGroup && patientDetailsData) {
            console.log("Patching patient_details_update using:", patientDetailsData);
           patientDetailsGroup.patchValue({
               emergency_contact_name: patientDetailsData.emergency_contact_name || '',
               emergency_contact_phone: patientDetailsData.emergency_contact_phone || '',
               emergency_contact_relationship: patientDetailsData.emergency_contact_relationship || ''
           }, { emitEvent: false });
       }
       else {
            console.warn("Patient details data/group missing for patient_details_update patch. Resetting group.");
            // Explicitly reset the group if no details data found to prevent stale data
            patientDetailsGroup?.reset({
                emergency_contact_name: '',
                emergency_contact_phone: '',
                emergency_contact_relationship: ''
            }, { emitEvent: false }); // Reset without triggering valueChanges
       }
       console.log('Form value AFTER patch:', this.profileForm.getRawValue());
  }

   // Formats a date string (or null) into 'YYYY-MM-DD' format for input type="date"
   formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null;
     try {
       const date = new Date(dateStr);
       // Check if the date object is valid
       if (isNaN(date.getTime())) {
           console.warn(`Invalid date string received for formatting: ${dateStr}`);
           return null; // Return null for invalid dates
       }
       // Format to YYYY-MM-DD
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

    // Mark all controls as touched to show validation feedback visually
    this.profileForm.markAllAsTouched();

    // Check overall form validity first
    if (this.profileForm.invalid) {
      console.error("Profile Form IS INVALID. Halting submission.");
      this.logFormErrors(this.profileForm); // Log specific control errors
      this.errorMessage = "Please correct the errors highlighted in the form.";
      this.cdRef.detectChanges(); // Show error message
      return;
    }
    // Check if any changes were actually made using Angular's dirty flag
    if (!this.profileForm.dirty) {
        console.warn("No changes detected (form not dirty). Nothing to save.");
        this.successMessage = "No changes were made to save.";
        this.cdRef.detectChanges(); // Show info message
        setTimeout(() => this.successMessage = null, 3000); // Clear message after 3s
        return;
      }

    // If valid and dirty, proceed
    console.log("Profile form is valid and dirty. Proceeding with API update...");
    this.isSaving = true; // Show saving indicator on button
    this.cdRef.detectChanges();

    // Prepare payload matching the backend UserProfileSerializer write_only fields structure
    const rawValue = this.profileForm.getRawValue(); // Includes values from disabled controls if needed
    const profileDataPayload = {
        // Direct profile fields that are editable
        phone_number: rawValue.phone_number,
        address: rawValue.address,
        date_of_birth: rawValue.date_of_birth,
        // Nested update objects (keys match write_only fields in serializer)
        user_update: rawValue.user_update,
        patient_details_update: rawValue.patient_details_update
        // Add 'doctor_details_update' here if this component handles doctors
    };

    console.log("Submitting updated profile data payload:", profileDataPayload);

    // Call the API service to update the profile
    this.apiService.updateProfile(profileDataPayload)
      .pipe(
          finalize(() => { // Always runs after success or error
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
           this.initialProfileData = updatedProfile; // Update initial data state with response
           this.patchForm(updatedProfile); // Update form with potentially processed data
           this.profileForm.markAsPristine(); // Mark clean again after successful save
           this.cdRef.detectChanges(); // Ensure success message shows
           // Optionally refresh global auth state
           // this.authService.fetchAndSetUserProfile().subscribe();
           setTimeout(() => this.successMessage = null, 4000); // Hide message after 4s
        },
        error: (err) => { // Handle errors during update
          console.error("Error updating profile API call:", err);
          this.parseAndSetErrorMessage(err); // Use helper to parse/set error message
          this.cdRef.detectChanges(); // Ensure error message shows
        }
      });
  }

   // --- Getters for Template Access ---
   get email(): AbstractControl | null { return this.profileForm.get('user_update.email'); }
   get first_name(): AbstractControl | null { return this.profileForm.get('user_update.first_name'); }
   get last_name(): AbstractControl | null { return this.profileForm.get('user_update.last_name'); }
   get phone_number(): AbstractControl | null { return this.profileForm.get('phone_number'); }
   get address(): AbstractControl | null { return this.profileForm.get('address'); }
   get date_of_birth(): AbstractControl | null { return this.profileForm.get('date_of_birth'); }
   get emergency_contact_name(): AbstractControl | null { return this.profileForm.get('patient_details_update.emergency_contact_name'); }
   get emergency_contact_phone(): AbstractControl | null { return this.profileForm.get('patient_details_update.emergency_contact_phone'); }
   get emergency_contact_relationship(): AbstractControl | null { return this.profileForm.get('patient_details_update.emergency_contact_relationship'); }

   // --- Helper function to log form errors recursively (for debugging) ---
   private logFormErrors(group: FormGroup | AbstractControl | null, prefix = ''): void {
       if (!group) return;
       if (group.errors) { Object.keys(group.errors).forEach(errorKey => { console.error(`${prefix}Form Group Error: ${errorKey} - ${JSON.stringify(group?.errors?.[errorKey])}`); }); }
       if (group instanceof FormGroup) { Object.keys(group.controls).forEach(key => { const control = group.get(key); if (control?.invalid) { console.error(`${prefix}Control '${key}': Status=${control?.status}, Errors=${JSON.stringify(control?.errors)}`); } if (control instanceof FormGroup) { this.logFormErrors(control, `${prefix}${key}.`); } }); }
   }

    // --- Helper function to parse backend errors ---
    private parseAndSetErrorMessage(err: any): void {
        let displayError = 'Failed to update profile due to an unexpected error.'; // Default
        if (err.error && typeof err.error === 'object') {
           let backendErrors = '';
           const parseErrors = (errors: any, currentPrefix = '') => {
               for (const key in errors) {
                   if (errors.hasOwnProperty(key)) {
                      const messages = Array.isArray(errors[key]) ? errors[key].join(', ') : String(errors[key]);
                      const fieldName = currentPrefix + key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      backendErrors += `- ${fieldName}: ${messages}\n`;
                   }
               }
           };
           // Check known nested structures first
           if(err.error.user_update) parseErrors(err.error.user_update, 'Account - ');
           if(err.error.patient_details_update) parseErrors(err.error.patient_details_update, 'Emergency Contact - ');
           // Check for root level errors (excluding known nested keys)
           const rootErrors = {...err.error};
           delete rootErrors.user_update; delete rootErrors.patient_details_update;
           parseErrors(rootErrors);

           if (backendErrors.trim()) { displayError = `Update failed:\n${backendErrors.trim()}`; }
           else if (err.error.detail) { displayError = err.error.detail; } // Use detail if no specific field errors

        } else if (err.error?.detail) { displayError = err.error.detail; } // Handle plain detail error
        else if(err.message) { displayError = `Update failed: ${err.message}`; } // Handle network/generic JS error
        this.errorMessage = displayError;
    }
}