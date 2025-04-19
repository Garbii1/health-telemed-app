// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core'; // Import NgZone
import { CommonModule } from '@angular/common'; // For *ngIf, etc.
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, FormControl } from '@angular/forms'; // For reactive forms & FormControl
import { ApiService } from '../../../core/services/api.service'; // Service to interact with backend
import { AuthService } from '../../../core/services/auth.service'; // Optional: For refreshing user info globally
import { finalize, Subject, of, Subscription } from 'rxjs'; // RxJS utilities
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
  profileForm!: FormGroup; // Use definite assignment assertion as it's initialized in buildForm/constructor
  isLoading = true; // Flag for initial data loading state, start true
  isSaving = false; // Flag for save button loading state
  errorMessage: string | null = null; // Holds error messages for display
  successMessage: string | null = null; // Holds success messages for display
  isDataRendered = false; // Flag to control template rendering after data load & patch
  private destroy$ = new Subject<void>(); // Subject for managing observable unsubscriptions
  private profileSubscription: Subscription | null = null; // To manage the profile loading subscription

  constructor(
    private fb: FormBuilder, // Inject FormBuilder service
    private apiService: ApiService, // Inject custom API service
    private authService: AuthService, // Inject Auth service (optional)
    private cdRef: ChangeDetectorRef, // Inject ChangeDetectorRef for manual UI updates if needed
    private zone: NgZone // Inject NgZone for manual zone control
  ) {
    this.buildForm(); // Initialize the form structure in the constructor
  }

  // --- Form Building Method ---
  // Initializes or re-initializes the complete form structure
  private buildForm(): void {
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
    console.log("Form rebuilt.");
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
      this.profileSubscription?.unsubscribe(); // Explicitly unsubscribe just in case
  }

  // --- Data Loading Method ---
  loadProfile(): void {
    console.log("loadProfile called");
    this.isLoading = true;
    this.isDataRendered = false; // Hide form while loading/reloading
    this.errorMessage = null;
    this.successMessage = null;
    this.buildForm(); // Rebuild the form to ensure clean state
    this.cdRef.detectChanges(); // Show loader

    this.profileSubscription?.unsubscribe(); // Cancel previous request if any

    this.profileSubscription = this.apiService.getProfile().pipe(
        tap(profile => console.log("API Success: Profile data received:", profile)),
        catchError(err => {
            console.error("API CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load your profile data. Please try again later.";
            this.isDataRendered = false; // Ensure form remains hidden on error
            return of(null); // Return null observable
        }),
        finalize(() => { // This block *always* runs after success or error
            // We set isLoading = false inside the NgZone run block below
            // to ensure it happens AFTER patching attempts
            console.log("API FINALIZE");
        }),
        takeUntil(this.destroy$) // Auto-unsubscribe
    ).subscribe({
        next: (profile) => {
          if (profile) {
              // Run patching and state updates within NgZone runOutsideAngular/run
              this.zone.runOutsideAngular(() => {
                console.log("Running patchForm OUTSIDE Angular zone");
                try {
                    this.patchFormAndResetNested(profile); // Patch the form values
                    this.profileForm.markAsPristine();    // Mark state AFTER patching
                    this.profileForm.markAsUntouched();
                    console.log("Patching complete outside zone.");

                    // Re-enter Angular zone ONLY to update final flags and trigger CD
                    this.zone.run(() => {
                        console.log("Re-entering zone to set flags and detect changes");
                        this.isDataRendered = true; // Allow rendering now
                        this.isLoading = false; // Set loading false HERE
                        this.cdRef.detectChanges(); // Trigger one final CD
                        console.log("State updated inside zone, isDataRendered=true, isLoading=false.");
                    });
                } catch(patchError) {
                    console.error("ERROR during form patching (outside zone attempt):", patchError);
                    // Re-enter zone to update error state
                    this.zone.run(() => {
                        this.errorMessage = "Error displaying profile data correctly.";
                        this.isLoading = false; // Stop loading
                        this.isDataRendered = false; // Keep form hidden
                        this.cdRef.detectChanges(); // Show error
                    });
                }
              }); // End runOutsideAngular
          } else {
              // Error occurred and was handled by catchError
              console.log("Profile data was null (error handled).");
              this.isLoading = false; // Stop loading
              this.isDataRendered = false; // Keep form hidden
              this.cdRef.detectChanges(); // Update UI to show error message
          }
        },
        error: (err) => {
            // Fallback error handling (if catchError somehow fails or rethrows)
            console.error("Subscription Error block:", err);
            this.errorMessage = this.errorMessage || "An unexpected error occurred.";
            this.isLoading = false; // Stop loading
            this.isDataRendered = false; // Keep form hidden
            this.cdRef.detectChanges(); // Update UI
        }
    });
  }

  // --- Helper Methods ---

  // Patches form values: Patches top-level, REBUILDS nested controls before patching them
  private patchFormAndResetNested(profile: any): void {
       console.log("Patching form (resetting nested first):", profile);

       // 1. Patch top-level fields
       this.profileForm.patchValue({
         username: profile?.user?.username ?? '',
         phone_number: profile?.phone_number ?? '',
         address: profile?.address ?? '',
         date_of_birth: this.formatDateForInput(profile?.date_of_birth),
       }, { emitEvent: false });

       // 2. Rebuild and Patch nested user_update group
       const userUpdateGroup = this.profileForm.get('user_update') as FormGroup;
       if (userUpdateGroup) {
           // Ensure controls exist before setting them again (safer than remove/add)
           if (!userUpdateGroup.get('email')) userUpdateGroup.addControl('email', this.fb.control('', [Validators.required, Validators.email]));
           if (!userUpdateGroup.get('first_name')) userUpdateGroup.addControl('first_name', this.fb.control('', Validators.required));
           if (!userUpdateGroup.get('last_name')) userUpdateGroup.addControl('last_name', this.fb.control('', Validators.required));

           if (profile?.user) {
               console.log("Patching user_update:", profile.user);
               userUpdateGroup.patchValue({
                   email: profile.user.email ?? '',
                   first_name: profile.user.first_name ?? '',
                   last_name: profile.user.last_name ?? '',
               }, { emitEvent: false });
           } else {
                console.warn("User data missing for user_update patch. Resetting group.");
                userUpdateGroup.reset({ email: '', first_name: '', last_name: '' }, { emitEvent: false });
           }
       } else { console.error("user_update FormGroup not found!"); }


       // 3. Rebuild and Patch nested patient_details_update group
       const patientDetailsGroup = this.profileForm.get('patient_details_update') as FormGroup;
       const patientDetailsData = profile?.patient_details ?? profile?.details; // Check both potential keys
        if (patientDetailsGroup) {
             // Ensure controls exist
            if (!patientDetailsGroup.get('emergency_contact_name')) patientDetailsGroup.addControl('emergency_contact_name', this.fb.control(''));
            if (!patientDetailsGroup.get('emergency_contact_phone')) patientDetailsGroup.addControl('emergency_contact_phone', this.fb.control(''));
            if (!patientDetailsGroup.get('emergency_contact_relationship')) patientDetailsGroup.addControl('emergency_contact_relationship', this.fb.control(''));

            if (patientDetailsData) {
                console.log("Patching patient_details_update using:", patientDetailsData);
                patientDetailsGroup.patchValue({
                    emergency_contact_name: patientDetailsData.emergency_contact_name || '',
                    emergency_contact_phone: patientDetailsData.emergency_contact_phone || '',
                    emergency_contact_relationship: patientDetailsData.emergency_contact_relationship || ''
                }, { emitEvent: false });
           } else {
                console.warn("Patient details data missing for patient_details_update patch. Resetting group.");
                patientDetailsGroup.reset({ // Reset if no data found
                    emergency_contact_name: '',
                    emergency_contact_phone: '',
                    emergency_contact_relationship: ''
                }, { emitEvent: false });
           }
        } else { console.warn("patient_details_update FormGroup missing."); } // Warn instead of error

       console.log('Form value AFTER patch:', this.profileForm.getRawValue());
       this.profileForm.get('username')?.disable({ emitEvent: false }); // Ensure username remains disabled
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
       // Format to YYYY-MM-DD required by <input type="date">
       const year = date.getFullYear();
       const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
       const day = date.getDate().toString().padStart(2, '0');
       return `${year}-${month}-${day}`;
     } catch (e) {
         console.error("Error formatting date:", dateStr, e);
         return null; // Return null on error
     }
   }

   // --- Debugging method attached to the button's (click) event (can be removed later) ---
   onSaveButtonClick() {
       console.log('SAVE CHANGES BUTTON CLICKED!');
       console.log('Form valid on button click?', this.profileForm.valid);
       console.log('Form dirty on button click?', this.profileForm.dirty);
       if(this.profileForm.invalid) {
           this.logFormErrors(this.profileForm);
       }
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
           this.isDataRendered = false; // Briefly hide form while re-patching
           this.cdRef.detectChanges();
           setTimeout(() => { // Re-patch after a tick
               this.patchFormAndResetNested(updatedProfile); // Update form with potentially processed data
               this.profileForm.markAsPristine(); // Mark clean again after successful save
               this.isDataRendered = true; // Show form again
               this.cdRef.detectChanges(); // Ensure success message and updated form show
               setTimeout(() => this.successMessage = null, 4000); // Hide message after 4s
            }, 0);
           // Optionally refresh global auth state
           // this.authService.fetchAndSetUserProfile().subscribe();
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
       // Log group-level errors
       if (group.errors) { Object.keys(group.errors).forEach(errorKey => { console.error(`${prefix}Form Group Error: ${errorKey} - ${JSON.stringify(group?.errors?.[errorKey])}`); }); }
       // Log errors for controls within the group
       if (group instanceof FormGroup) { Object.keys(group.controls).forEach(key => { const control = group.get(key); if (control && control.invalid) { console.error(`${prefix}Control '${key}': Status=${control?.status}, Errors=${JSON.stringify(control?.errors)}`); } if (control instanceof FormGroup) { this.logFormErrors(control, `${prefix}${key}.`); } }); }
   }

    // --- Helper function to parse backend errors ---
    private parseAndSetErrorMessage(err: any): void {
        let displayError = 'Failed to update profile due to an unexpected error.'; // Default message
        if (err.error && typeof err.error === 'object') {
           let backendErrors = '';
           // Recursive function to parse nested errors
           const parseErrors = (errors: any, currentPrefix = '') => {
               for (const key in errors) {
                   if (errors.hasOwnProperty(key)) {
                      // If the value is another object (and not an array), recurse
                      if (typeof errors[key] === 'object' && !Array.isArray(errors[key]) && errors[key] !== null) {
                          // Adjust prefix for nested fields like 'User update - Email'
                          const nestedPrefix = currentPrefix + key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' - ';
                          parseErrors(errors[key], nestedPrefix);
                      } else {
                          // Otherwise, handle error arrays or strings
                          const messages = Array.isArray(errors[key]) ? errors[key].join(', ') : String(errors[key]);
                          // Create more readable field names
                          const fieldName = currentPrefix + key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                          backendErrors += `- ${fieldName}: ${messages}\n`;
                      }
                   }
               }
           };
           // Start parsing from the root error object
           parseErrors(err.error);

           if (backendErrors.trim()) { // Use parsed errors if available
               displayError = `Update failed:\n${backendErrors.trim()}`;
           } else if (err.error.detail) { // Fallback to detail if no specific field errors parsed
                displayError = err.error.detail;
           }

        } else if (err.error?.detail) { displayError = err.error.detail; } // Handle plain string detail error
        else if(err.message) { displayError = `Update failed: ${err.message}`; } // Handle network/generic JS error

        this.errorMessage = displayError;
    }
}