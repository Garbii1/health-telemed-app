// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf
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
  profileForm: FormGroup; // The main form group for the profile data
  isLoading = true;       // Flag for initial data loading state
  isSaving = false;       // Flag for save button loading state
  errorMessage: string | null = null; // Holds error messages for display
  successMessage: string | null = null; // Holds success messages for display
  initialProfileData: any = null;    // Holds the raw profile data fetched from API (used by *ngIf in template)
  private destroy$ = new Subject<void>(); // Subject to manage observable unsubscriptions

  constructor(
    private fb: FormBuilder,           // Inject FormBuilder service
    private apiService: ApiService,      // Inject custom API service
    private authService: AuthService,   // Inject Auth service (optional)
    private cdRef: ChangeDetectorRef  // Inject ChangeDetectorRef for manual UI updates if needed
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
    this.isLoading = true; // Show loading indicator
    this.errorMessage = null; // Clear previous errors
    this.successMessage = null;
    this.initialProfileData = null; // Ensure form *ngIf is false initially
    // Reset form state BEFORE making API call, disable username after reset
    this.profileForm.reset({}, { emitEvent: false });
    this.profileForm.get('username')?.disable({ emitEvent: false });
    this.cdRef.detectChanges(); // Update view to show loading state

    this.apiService.getProfile().pipe(
        tap(profile => console.log("API Success: Profile data received:", profile)), // Log successful fetch
        catchError(err => { // Handle errors during the API call
            console.error("API CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load your profile data. Please try again later.";
            this.initialProfileData = null; // Keep null on error so *ngIf hides the form
            return of(null); // Return a null observable so the stream completes
        }),
        // Manage isLoading state within subscribe/error for better control with patching
        // finalize(() => { ... }) // finalize removed
        takeUntil(this.destroy$) // Auto-unsubscribe when component is destroyed
    ).subscribe({
        next: (profile) => {
          this.initialProfileData = profile; // Assign data received (or null if error occurred)
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
              // Error occurred and was handled by catchError, message already set
              console.log("Profile data was null after API call (error handled). Form not patched.");
          }
          // Set loading false AFTER attempting to patch or handling error
          this.isLoading = false;
          this.cdRef.detectChanges(); // Ensure UI updates after all processing in 'next'
        },
        error: (err) => { // Catch errors that might bypass catchError (less likely)
            console.error("Subscription Error block (should have been caught earlier):", err);
            this.errorMessage = this.errorMessage || "An unexpected error occurred loading profile."; // Keep specific msg if set
            this.isLoading = false; // Ensure loading stops on unexpected subscription error
            this.initialProfileData = null; // Hide form on error
            this.cdRef.detectChanges(); // Ensure UI updates on error
        }
    });
  }

  // --- Helper Methods ---

  // Patches the form with data received from the API, handling nested groups defensively
  private patchForm(profile: any): void {
       console.log("Patching form with data:", profile);
       // Patch top-level fields first
       this.profileForm.patchValue({
         username: profile?.user?.username ?? '',
         phone_number: profile?.phone_number ?? '',
         address: profile?.address ?? '',
         date_of_birth: this.formatDateForInput(profile?.date_of_birth),
       }, { emitEvent: false });

       // Patch nested user_update group defensively
       const userUpdateGroup = this.profileForm.get('user_update') as FormGroup;
       if (userUpdateGroup && profile?.user) {
           userUpdateGroup.patchValue({
               email: profile.user.email ?? '',
               first_name: profile.user.first_name ?? '',
               last_name: profile.user.last_name ?? '',
           }, { emitEvent: false });
       } else { console.warn("User data/group missing for user_update patch."); }

       // Patch nested patient_details_update group defensively
       const patientDetailsGroup = this.profileForm.get('patient_details_update') as FormGroup;
       const patientDetailsData = profile?.patient_details ?? profile?.details; // Check direct key and 'details' key

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
            patientDetailsGroup?.reset({ // Reset if no data found
                emergency_contact_name: '',
                emergency_contact_phone: '',
                emergency_contact_relationship: ''
            }, { emitEvent: false });
       }
       console.log('Form value AFTER patch:', this.profileForm.getRawValue());
  }

   // Formats a date string (or null) into 'YYYY-MM-DD' format for input type="date"
   formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null;
     try {
       const date = new Date(dateStr);
       if (isNaN(date.getTime())) {
           console.warn(`Invalid date string received for formatting: ${dateStr}`);
           return null;
       }
       const year = date.getFullYear();
       const month = (date.getMonth() + 1).toString().padStart(2, '0');
       const day = date.getDate().toString().padStart(2, '0');
       return `${year}-${month}-${day}`;
     } catch (e) {
         console.error("Error formatting date:", dateStr, e);
         return null;
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
    this.errorMessage = null; this.successMessage = null;

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

    // Proceed if form is valid and dirty
    console.log("Profile form is valid and dirty. Proceeding with API update...");
    this.isSaving = true; // Show saving indicator on button
    this.cdRef.detectChanges();

    // Prepare payload matching the backend UserProfileSerializer write_only fields structure
    const rawValue = this.profileForm.getRawValue();
    const profileDataPayload = {
        phone_number: rawValue.phone_number,
        address: rawValue.address,
        date_of_birth: rawValue.date_of_birth,
        user_update: rawValue.user_update, // Nested object for user fields
        patient_details_update: rawValue.patient_details_update // Nested object for patient fields
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
        let displayError = 'Failed to update profile due to an unexpected error.'; // Default message
        if (err.error && typeof err.error === 'object') {
           let backendErrors = '';
           const parseErrors = (errors: any, currentPrefix = '') => { /* ... error parsing logic ... */ };
           if(err.error.user_update) parseErrors(err.error.user_update, 'Account - ');
           if(err.error.patient_details_update) parseErrors(err.error.patient_details_update, 'Emergency Contact - ');
           const rootErrors = {...err.error}; delete rootErrors.user_update; delete rootErrors.patient_details_update;
           parseErrors(rootErrors);
           if (backendErrors.trim()) { displayError = `Update failed:\n${backendErrors.trim()}`; }
           else if (err.error.detail) { displayError = err.error.detail; } // Use detail if no specific field errors
        } else if (err.error?.detail) { displayError = err.error.detail; }
        else if(err.message) { displayError = `Update failed: ${err.message}`; }
        this.errorMessage = displayError;
    }
}