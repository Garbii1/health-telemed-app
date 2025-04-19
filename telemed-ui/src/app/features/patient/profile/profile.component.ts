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
  initialProfileData: any = null; // Store initial data received from API, used in *ngIf
  private destroy$ = new Subject<void>(); // To manage observable subscriptions

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService, // Keep if needed for refreshing user info
    private cdRef: ChangeDetectorRef // Inject for manual change detection
  ) {
    // Initialize the form structure in the constructor
    this.profileForm = this.fb.group({
      username: [{value: '', disabled: true}], // Username not editable
      // User details nested group for update payload structure
      user_update: this.fb.group({
          email: ['', [Validators.required, Validators.email]],
          first_name: ['', Validators.required],
          last_name: ['', Validators.required]
      }),
      // Direct profile fields
      phone_number: ['', Validators.required],
      address: ['', Validators.required],
      date_of_birth: ['', Validators.required],
      // Patient specific details nested group for update payload structure
      patient_details_update: this.fb.group({
        emergency_contact_name: [''],
        emergency_contact_phone: [''],
        emergency_contact_relationship: ['']
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
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    // Reset form state before loading new data
    // Resetting here might clear values before patching if API is very fast,
    // Consider resetting only if there was a previous error or patch inside 'next'.
    // this.profileForm.reset();
    // this.profileForm.get('username')?.disable(); // Re-disable username after reset if needed
    this.cdRef.detectChanges(); // Ensure loading spinner shows

    this.apiService.getProfile().pipe(
        tap(profile => console.log("SUCCESS: Profile data received:", profile)),
        catchError(err => {
            console.error("CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load profile data. Please try again.";
            this.initialProfileData = null; // Set to null on error so *ngIf hides the form
            return of(null); // Return null observable
        }),
        finalize(() => { // Runs on completion or error
            console.log("FINALIZE: Setting isLoading = false");
            this.isLoading = false;
            this.cdRef.detectChanges(); // Update view after loading finishes
        }),
        takeUntil(this.destroy$) // Auto-unsubscribe when component destroyed
    ).subscribe({
        next: (profile) => {
          if (profile) { // Only patch form if data was successfully received
              this.initialProfileData = profile; // <<< Assign fetched data HERE for *ngIf
              this.patchForm(profile); // Patch the form with received data
              this.profileForm.markAsPristine(); // Mark form as clean after loading and patching
              this.profileForm.markAsUntouched();
              console.log("Profile form patched and marked pristine/untouched.");
          } else {
              console.log("Profile data was null after API call (error handled). Form not patched.");
               // Error message is already set by catchError
          }
        }
        // No separate error block needed here as catchError handles it
    });
  }

  // Helper function to patch form values including nested groups SEPARATELY
  private patchForm(profile: any): void {
       console.log("Patching form with data:", profile);
       // Patch top-level fields first
       this.profileForm.patchValue({
         username: profile.user?.username, // Only for display, control is disabled
         phone_number: profile.phone_number,
         address: profile.address,
         date_of_birth: this.formatDateForInput(profile.date_of_birth),
       }, { emitEvent: false });

       // Patch nested user_update group if it exists
       const userUpdateGroup = this.profileForm.get('user_update');
       if (userUpdateGroup && profile.user) {
           console.log("Patching user_update:", profile.user);
           userUpdateGroup.patchValue({
               email: profile.user.email,
               first_name: profile.user.first_name,
               last_name: profile.user.last_name,
           }, { emitEvent: false });
       } else {
           console.warn("User data missing in profile or user_update group missing.");
       }

       // Patch nested patient_details_update group if it exists and we have details
       // Note: 'details' comes from the get_details SerializerMethodField in UserProfileSerializer GET response
       const patientDetailsGroup = this.profileForm.get('patient_details_update');
       if (patientDetailsGroup && profile.details) {
            console.log("Patching patient_details_update:", profile.details);
           patientDetailsGroup.patchValue({
               emergency_contact_name: profile.details.emergency_contact_name || '',
               emergency_contact_phone: profile.details.emergency_contact_phone || '',
               emergency_contact_relationship: profile.details.emergency_contact_relationship || ''
           }, { emitEvent: false });
       } else {
            console.warn("Patient details missing in profile or patient_details_update group missing.");
            // Optionally reset this group if no details are present
            // patientDetailsGroup?.reset({ emergency_contact_name: '', ... }, { emitEvent: false });
       }

       // Log form value after patching for debugging
        console.log('Form value AFTER patch:', this.profileForm.value);
  }

   // Helper to format date string (YYYY-MM-DD) for date input control
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
         console.error("Error formatting date:", e);
         return null;
     }
   }

   // --- Debugging method for button click ---
   onSaveButtonClick() {
       console.log('SAVE CHANGES BUTTON CLICKED!');
       console.log('Form valid on button click?', this.profileForm.valid);
       console.log('Form dirty on button click?', this.profileForm.dirty);
   }

  // Handles form submission to update profile
  onSubmit(): void {
    console.log("Profile onSubmit CALLED");
    this.errorMessage = null; // Clear previous messages
    this.successMessage = null;

    console.log('Is Profile Form Valid?:', this.profileForm.valid);
    console.log('Is Profile Form Dirty?:', this.profileForm.dirty);

    // Mark all fields as touched FIRST to show potential errors from previous interactions
    this.profileForm.markAllAsTouched();

    if (this.profileForm.invalid) {
      console.error("Profile Form IS INVALID. Halting submission.");
      this.errorMessage = "Please correct the errors highlighted in the form.";
      this.cdRef.detectChanges(); // Make sure error message shows
      return;
    }

    // Use Angular's built-in dirty check
    if (!this.profileForm.dirty) {
        console.warn("No changes detected in profile form (form not dirty). Nothing to save.");
        // Optionally show a message, or just do nothing
        // this.successMessage = "No changes were made to save.";
        // this.cdRef.detectChanges();
        // setTimeout(() => this.successMessage = null, 3000);
        return; // Stop if nothing changed
      }

    console.log("Profile form is valid and dirty. Proceeding with update...");
    this.isSaving = true;
    this.cdRef.detectChanges();

    // Prepare payload matching the backend UserProfileSerializer write_only fields
    // Use getRawValue() if backend needs disabled fields (like username), else use .value
    const rawValue = this.profileForm.getRawValue();
    const profileDataPayload = {
        // Direct profile fields that are NOT disabled
        phone_number: rawValue.phone_number,
        address: rawValue.address,
        date_of_birth: rawValue.date_of_birth,
        // Nested update objects
        user_update: rawValue.user_update,
        patient_details_update: rawValue.patient_details_update
    };

    console.log("Submitting updated profile data:", profileDataPayload);

    this.apiService.updateProfile(profileDataPayload)
      .pipe(
          finalize(() => {
              this.isSaving = false;
              this.cdRef.detectChanges();
              console.log("updateProfile API call finalized.");
          }),
          takeUntil(this.destroy$)
      )
      .subscribe({
        next: (updatedProfile) => {
          console.log("Profile update SUCCESSFUL:", updatedProfile);
          this.successMessage = "Profile updated successfully!";
           // Update the form and initial snapshot with response data
           this.patchForm(updatedProfile); // Re-patch form with potentially processed data
           this.profileForm.markAsPristine(); // Mark clean again
           this.cdRef.detectChanges();
           setTimeout(() => this.successMessage = null, 4000);
           // Optionally re-fetch global user info
           // this.authService.fetchAndSetUserProfile().subscribe();
        },
        error: (err) => {
          console.error("Error updating profile:", err);
          // Parse and display backend errors
           if (err.error && typeof err.error === 'object') {
              let backendErrors = '';
              const handleNestedErrors = (nestedData: any, prefix: string = '') => { /* ... error parsing logic ... */ };
              if (err.error.user_update) handleNestedErrors(err.error.user_update, 'User - ');
              if (err.error.patient_details_update) handleNestedErrors(err.error.patient_details_update, 'Patient Details - ');
              handleNestedErrors(err.error); // Handle root level errors
              this.errorMessage = `Update failed:\n${backendErrors.trim() || 'Please check your input.'}`;
           } else if (err.error?.detail) { this.errorMessage = err.error.detail; }
           else if(err.message) { this.errorMessage = `Update failed: ${err.message}`; }
           else { this.errorMessage = "Failed to update profile due to an unexpected error."; }
           this.cdRef.detectChanges(); // Ensure error message shows
        }
      });
  }

   // --- Getters for easy template access ---
   get email(): AbstractControl | null { return this.profileForm.get('user_update.email'); }
   get first_name(): AbstractControl | null { return this.profileForm.get('user_update.first_name'); }
   get last_name(): AbstractControl | null { return this.profileForm.get('user_update.last_name'); }
   get phone_number(): AbstractControl | null { return this.profileForm.get('phone_number'); }
   get address(): AbstractControl | null { return this.profileForm.get('address'); }
   get date_of_birth(): AbstractControl | null { return this.profileForm.get('date_of_birth'); }
   get emergency_contact_name(): AbstractControl | null { return this.profileForm.get('patient_details_update.emergency_contact_name'); }
   get emergency_contact_phone(): AbstractControl | null { return this.profileForm.get('patient_details_update.emergency_contact_phone'); }
   get emergency_contact_relationship(): AbstractControl | null { return this.profileForm.get('patient_details_update.emergency_contact_relationship'); }
}