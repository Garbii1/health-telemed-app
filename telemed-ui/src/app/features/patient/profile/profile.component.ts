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
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class PatientProfileComponent implements OnInit, OnDestroy {
  // --- Component Properties ---
  profileForm: FormGroup; // Declare FormGroup type
  isLoading = true;       // Flag for initial data loading state
  isSaving = false;       // Flag for save button loading state
  errorMessage: string | null = null; // Holds error messages for display
  successMessage: string | null = null; // Holds success messages for display
  initialProfileData: any = null;    // Holds the raw profile data fetched from API (used for *ngIf)
  private destroy$ = new Subject<void>(); // RxJS Subject for managing unsubscriptions

  constructor(
    private fb: FormBuilder,           // Inject FormBuilder
    private apiService: ApiService,      // Inject API service
    private authService: AuthService,   // Inject Auth service (optional)
    private cdRef: ChangeDetectorRef  // Inject ChangeDetectorRef for manual updates
  ) {
    // Initialize the form structure immediately in the constructor
    this.profileForm = this.fb.group({
      // Username is displayed but not editable
      username: [{value: '', disabled: true}],
      // Nested group for user fields to match backend update structure
      user_update: this.fb.group({
          email: ['', [Validators.required, Validators.email]],
          first_name: ['', Validators.required],
          last_name: ['', Validators.required]
      }),
      // Direct profile fields
      phone_number: ['', Validators.required],
      address: ['', Validators.required],
      date_of_birth: ['', Validators.required],
      // Nested group for patient-specific fields to match backend update structure
      patient_details_update: this.fb.group({
        emergency_contact_name: [''],
        emergency_contact_phone: [''],
        emergency_contact_relationship: [''] // Added field
      })
    });
  }

  // --- Lifecycle Hooks ---
  ngOnInit(): void {
    console.log("PatientProfile OnInit");
    this.loadProfile(); // Fetch profile data when component loads
  }

  ngOnDestroy(): void {
      console.log("PatientProfile OnDestroy");
      this.destroy$.next(); // Signal completion to observables using takeUntil
      this.destroy$.complete(); // Complete the subject
  }

  // --- Data Loading Method ---
  loadProfile(): void {
    console.log("loadProfile called");
    this.isLoading = true; // Show loading spinner
    this.errorMessage = null; // Clear previous errors
    this.successMessage = null; // Clear previous success message
    this.profileForm.reset(); // Reset form to clear previous values/errors
    this.profileForm.get('username')?.disable(); // Ensure username stays disabled after reset
    this.cdRef.detectChanges(); // Update view to show loading state

    this.apiService.getProfile().pipe(
        tap(profile => console.log("API Success: Profile data received:", profile)),
        catchError(err => {
            console.error("API CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load your profile data. Please try again later.";
            this.initialProfileData = null; // Ensure form doesn't render if data load failed
            return of(null); // Return null observable for finalize to run
        }),
        finalize(() => { // Always runs after success or error
            console.log("API FINALIZE: Setting isLoading = false");
            this.isLoading = false; // Hide loading spinner
            this.cdRef.detectChanges(); // Update view after loading finishes
        }),
        takeUntil(this.destroy$) // Auto-unsubscribe
    ).subscribe({
        next: (profile) => {
          // Store the data to control template *ngIf visibility
          this.initialProfileData = profile;
          if (profile) {
              // If data received, patch the form
              this.patchForm(profile);
              // Mark form as pristine (unchanged) after initial load
              this.profileForm.markAsPristine();
              this.profileForm.markAsUntouched();
              console.log("Profile form patched and marked pristine/untouched.");
          } else {
              // Error occurred and was handled by catchError
              console.log("Profile data was null after API call (error handled).");
          }
          // Final check to ensure UI is up-to-date after all operations
          this.cdRef.detectChanges();
        }
    });
  }

  // --- Helper Methods ---

  // Patches form values defensively, checking for nested groups/data
  private patchForm(profile: any): void {
       console.log("Patching form with data:", profile);
       // Patch top-level profile fields safely using nullish coalescing
       this.profileForm.patchValue({
         username: profile?.user?.username ?? '', // Patch disabled control's value
         phone_number: profile?.phone_number ?? '',
         address: profile?.address ?? '',
         date_of_birth: this.formatDateForInput(profile?.date_of_birth),
       }, { emitEvent: false }); // Prevent valueChanges triggers during patch

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
       // Assumes GET response puts patient details under 'details' key
       const patientDetailsGroup = this.profileForm.get('patient_details_update') as FormGroup;
       if (patientDetailsGroup && profile?.details) {
           patientDetailsGroup.patchValue({
               emergency_contact_name: profile.details.emergency_contact_name || '',
               emergency_contact_phone: profile.details.emergency_contact_phone || '',
               emergency_contact_relationship: profile.details.emergency_contact_relationship || ''
           }, { emitEvent: false });
       } else { console.warn("Patient details/group missing for patient_details_update patch."); }

       console.log('Form value AFTER patch:', this.profileForm.getRawValue());
  }

   // Formats a date string (YYYY-MM-DD or null) into 'YYYY-MM-DD' format for input type="date"
   formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null;
     try {
       const date = new Date(dateStr);
       if (isNaN(date.getTime())) return null;
       const year = date.getFullYear();
       const month = (date.getMonth() + 1).toString().padStart(2, '0');
       const day = date.getDate().toString().padStart(2, '0');
       return `${year}-${month}-${day}`;
     } catch (e) {
         console.error("Error formatting date:", dateStr, e);
         return null;
     }
   }

   // Debugging method for button click (can be removed if onSubmit works)
   onSaveButtonClick() {
       console.log('SAVE CHANGES BUTTON CLICKED!');
       console.log('Form valid on button click?', this.profileForm.valid);
       console.log('Form dirty on button click?', this.profileForm.dirty);
   }

  // --- Form Submission ---
  onSubmit(): void {
    console.log("Profile onSubmit CALLED");
    this.errorMessage = null; this.successMessage = null; // Clear messages

    console.log('Is Profile Form Valid?:', this.profileForm.valid);
    console.log('Is Profile Form Dirty?:', this.profileForm.dirty);

    this.profileForm.markAllAsTouched(); // Show validation feedback visually

    if (this.profileForm.invalid) {
      console.error("Profile Form IS INVALID. Halting submission.");
      this.logFormErrors(this.profileForm); // Log specific errors
      this.errorMessage = "Please correct the errors highlighted in the form.";
      this.cdRef.detectChanges(); // Show error message
      return;
    }
    if (!this.profileForm.dirty) {
        console.warn("No changes detected (form not dirty). Nothing to save.");
        this.successMessage = "No changes were made to save.";
        this.cdRef.detectChanges(); // Show info message
        setTimeout(() => this.successMessage = null, 3000);
        return;
      }

    // Proceed if form is valid and dirty
    console.log("Profile form is valid and dirty. Proceeding with API update...");
    this.isSaving = true; // Show saving indicator
    this.cdRef.detectChanges();

    // Prepare payload matching backend expectations (with nested objects)
    const rawValue = this.profileForm.getRawValue(); // Includes disabled controls if needed
    const profileDataPayload = {
        phone_number: rawValue.phone_number,
        address: rawValue.address,
        date_of_birth: rawValue.date_of_birth,
        user_update: rawValue.user_update,
        patient_details_update: rawValue.patient_details_update
    };

    console.log("Submitting updated profile data:", profileDataPayload);

    this.apiService.updateProfile(profileDataPayload)
      .pipe(
          finalize(() => { // Always runs
              this.isSaving = false; // Hide saving indicator
              this.cdRef.detectChanges(); // Update button state
              console.log("updateProfile API call finalized.");
          }),
          takeUntil(this.destroy$) // Auto-unsubscribe
      )
      .subscribe({
        next: (updatedProfile) => { // Handle success
          console.log("Profile update SUCCESSFUL:", updatedProfile);
          this.successMessage = "Profile updated successfully!";
           this.patchForm(updatedProfile); // Update form with response
           this.profileForm.markAsPristine(); // Mark clean again
           this.cdRef.detectChanges(); // Show success message
           setTimeout(() => this.successMessage = null, 4000);
           // Optionally refresh global auth state
           // this.authService.fetchAndSetUserProfile().subscribe();
        },
        error: (err) => { // Handle error
          console.error("Error updating profile API call:", err);
          this.parseAndSetErrorMessage(err); // Use helper to parse error
          this.cdRef.detectChanges(); // Show error message
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
       // ... (Implementation as provided before) ...
   }

    // --- Helper function to parse backend errors ---
    private parseAndSetErrorMessage(err: any): void {
        if (err.error && typeof err.error === 'object') {
           let backendErrors = '';
           const parseErrors = (errors: any, currentPrefix = '') => {
               for (const key in errors) {
                   if (errors.hasOwnProperty(key)) {
                      const messages = Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key];
                      // Create more readable field names
                      const fieldName = currentPrefix + key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      backendErrors += `- ${fieldName}: ${messages}\n`;
                   }
               }
           }
           // Check common nested structures first
           parseErrors(err.error.user_update, 'Account - ');
           parseErrors(err.error.patient_details_update, 'Emergency Contact - ');
           // Check for root level errors (excluding known nested ones)
           const rootErrors = {...err.error};
           delete rootErrors.user_update;
           delete rootErrors.patient_details_update;
           parseErrors(rootErrors);

           this.errorMessage = `Update failed:\n${backendErrors.trim() || 'Please check your input and try again.'}`;

        } else if (err.error?.detail) { this.errorMessage = err.error.detail; }
        else if(err.message) { this.errorMessage = `Update failed: ${err.message}`; }
        else { this.errorMessage = "Failed to update profile due to an unexpected error."; }
    }
}