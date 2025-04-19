// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, etc.
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms'; // For forms
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
  profileForm: FormGroup; // Declare FormGroup type
  isLoading = true; // Flag for initial data loading state, start true
  isSaving = false; // Flag for save button loading state
  errorMessage: string | null = null; // Holds error messages for display
  successMessage: string | null = null; // Holds success messages for display
  // Flag to control template rendering after data load & patch
  isDataRendered = false;
   // Property to hold the raw profile data fetched from API (used by *ngIf in template)
   initialProfileData: any = null;
  private destroy$ = new Subject<void>(); // Subject for managing observable unsubscriptions
  private profileSubscription: Subscription | null = null; // To manage the profile loading subscription

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
      this.profileSubscription?.unsubscribe(); // Explicitly unsubscribe
  }

  // --- Data Loading Method ---
  loadProfile(): void {
    console.log("loadProfile called");
    this.isLoading = true;
    this.isDataRendered = false; // Hide form while loading/reloading
    this.errorMessage = null;
    this.successMessage = null;
    this.initialProfileData = null; // Reset flag for template *ngIf
    this.profileForm.reset({}, { emitEvent: false }); // Reset form silently before loading
    this.profileForm.get('username')?.disable({ emitEvent: false }); // Ensure username stays disabled
    this.cdRef.detectChanges(); // Update view to show loading state

    this.profileSubscription?.unsubscribe(); // Cancel previous request if any

    this.profileSubscription = this.apiService.getProfile().pipe(
        tap(profile => console.log("API Success: Profile data received:", profile)), // Log successful fetch
        catchError(err => { // Handle errors during the API call
            console.error("API CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load your profile data. Please try again later.";
            this.initialProfileData = null; // Ensure form remains hidden on error
            this.isDataRendered = false;
            return of(null); // Return a null observable so the stream completes
        }),
        finalize(() => { // This block *always* runs after success or error
            console.log("API FINALIZE: Setting isLoading = false");
            this.isLoading = false; // Hide loading indicator
            this.cdRef.detectChanges(); // Update view after loading finishes
        }),
        takeUntil(this.destroy$) // Auto-unsubscribe when component is destroyed
    ).subscribe({
        next: (profile) => {
          // Assign data AFTER loading is confirmed false (set in finalize)
          this.initialProfileData = profile; // Assign data for *ngIf check in template

          if (profile) { // Only process if data was successfully received
              try {
                this.patchForm(profile); // Populate the form with the fetched data
                this.profileForm.markAsPristine(); // Mark form as not dirty initially
                this.profileForm.markAsUntouched(); // Mark controls as untouched initially
                this.isDataRendered = true; // <<< Set flag to show form AFTER successful patch
                console.log("Profile form patched and marked pristine/untouched.");
              } catch (patchError) {
                 console.error("ERROR during form patching:", patchError);
                 this.errorMessage = "Error displaying profile data correctly."; // Show user-friendly error
                 this.isDataRendered = false; // Keep form hidden on patch error
              }
          } else {
              // Error occurred and was handled by catchError
              console.log("Profile data was null (error handled). Form not patched.");
              this.isDataRendered = false; // Ensure form doesn't render on API error
          }
          // Explicitly trigger change detection one last time after all processing in 'next'
          // This might be redundant if finalize already triggered it, but ensures consistency
          this.cdRef.detectChanges();
        },
        error: (err) => {
             // Error handled by catchError, finalize handles isLoading
             console.error("Subscription Error block (should have been caught earlier):", err);
             // Message is already set in catchError
             // this.isLoading = false; // Handled by finalize
             this.isDataRendered = false; // Ensure form is hidden on error
             // this.cdRef.detectChanges(); // Handled by finalize
        }
    });
  }

  // --- Helper Methods ---

  // Patches the form with data received from the API, handling nested groups defensively
  private patchForm(profile: any): void {
       console.log("Patching form with data:", profile);
       // Patch top-level profile fields safely using nullish coalescing
       this.profileForm.patchValue({
         username: profile?.user?.username ?? '',
         phone_number: profile?.phone_number ?? '',
         address: profile?.address ?? '',
         date_of_birth: this.formatDateForInput(profile?.date_of_birth),
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
            // Explicitly reset the group if no details data found
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

   // Debugging method attached to the button's (click) event (can be removed later)
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
    const rawValue = this.profileForm.getRawValue();
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
   // Provides convenient access to form controls in the HTML template, using nested paths
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