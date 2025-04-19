// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms'; // For forms
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
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
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  initialProfileData: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService, // Inject AuthService if needed for post-save updates
    private cdRef: ChangeDetectorRef
  ) {
    // Initialize the form structure
    this.profileForm = this.fb.group({
      username: [{value: '', disabled: true}], // Username usually not editable
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phone_number: ['', Validators.required],
      address: ['', Validators.required],
      date_of_birth: ['', Validators.required],
      patient_details: this.fb.group({ // Nested group for patient-specific details
        emergency_contact_name: [''],
        emergency_contact_phone: [''],
        emergency_contact_relationship: ['']
      })
    });
  }

  ngOnInit(): void {
    console.log("PatientProfile OnInit");
    this.loadProfile();
  }

  ngOnDestroy(): void {
      console.log("PatientProfile OnDestroy");
      this.destroy$.next();
      this.destroy$.complete();
  }

  // Method to fetch profile data from the API
  loadProfile(): void {
    console.log("loadProfile called");
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null; // Clear previous success message on reload
    this.cdRef.detectChanges(); // Trigger loading view update

    this.apiService.getProfile().pipe(
        tap(profile => console.log("SUCCESS: Profile data received:", profile)),
        catchError(err => {
            console.error("CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load profile data. Please try again.";
            return of(null); // Return null to allow finalize to run
        }),
        finalize(() => {
            console.log("FINALIZE: Setting isLoading = false");
            this.isLoading = false;
            this.cdRef.detectChanges(); // Update view after loading completes or errors
        }),
        takeUntil(this.destroy$)
    ).subscribe({
        next: (profile) => {
          if (profile) {
              // Store a deep copy for dirty checking comparison later
              this.initialProfileData = JSON.parse(JSON.stringify(profile));
              this.patchForm(profile); // Use helper to patch form
              this.profileForm.markAsPristine(); // Mark clean after load
              console.log("Profile form patched and marked pristine.");
          } else {
              console.log("Profile data was null after API call (error handled by catchError).");
          }
        }
        // No error block needed here as catchError handles it
    });
  }

  // Helper function to patch form values
  private patchForm(profile: any): void {
       this.profileForm.patchValue({
         username: profile.user?.username, // Use optional chaining for safety
         email: profile.user?.email,
         first_name: profile.user?.first_name,
         last_name: profile.user?.last_name,
         phone_number: profile.phone_number,
         address: profile.address,
         date_of_birth: this.formatDateForInput(profile.date_of_birth),
         patient_details: {
            emergency_contact_name: profile.patient_details?.emergency_contact_name || '',
            emergency_contact_phone: profile.patient_details?.emergency_contact_phone || '',
            emergency_contact_relationship: profile.patient_details?.emergency_contact_relationship || ''
          }
       });
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
     } catch (e) { return null; }
   }

  // Handles form submission to update profile
  onSubmit(): void {
    console.log("Profile onSubmit CALLED");

    // Log form state before checks
    console.log('Profile Form Value:', this.profileForm.getRawValue());
    console.log('Profile Form Status:', this.profileForm.status);
    console.log('Is Profile Form Valid?:', this.profileForm.valid);
    console.log('Is Profile Form Dirty?:', this.profileForm.dirty); // <<< Check if changes were made

    // Log individual control validity/dirty state if form is invalid or not dirty
     if (!this.profileForm.valid || !this.profileForm.dirty) {
        console.log('--- Profile Control States ---');
        Object.keys(this.profileForm.controls).forEach(key => {
            const control = this.profileForm.get(key);
            console.log(`${key}: Status=${control?.status}, Dirty=${control?.dirty}, Touched=${control?.touched}, Errors=${JSON.stringify(control?.errors)}`);
            if (control instanceof FormGroup) {
                 Object.keys(control.controls).forEach(nestedKey => {
                    const nestedControl = control.get(nestedKey);
                    console.log(`  ${key}.${nestedKey}: Status=${nestedControl?.status}, Dirty=${nestedControl?.dirty}, Touched=${nestedControl?.touched}, Errors=${JSON.stringify(nestedControl?.errors)}`);
                 });
            }
        });
        console.log('-----------------------------');
     }


    this.errorMessage = null; // Clear previous messages
    this.successMessage = null;

    // Mark all fields as touched to show validation errors visually
    this.profileForm.markAllAsTouched();

    // Check #1: Is the form valid according to validators?
    if (this.profileForm.invalid) {
      console.error("Profile Form IS INVALID. Halting submission.");
      this.errorMessage = "Please correct the errors highlighted in the form.";
      this.cdRef.detectChanges(); // Make sure error message shows
      return; // Prevent submission
    }

    // Check #2: Have any changes actually been made?
    if (!this.profileForm.dirty) {
        console.warn("No changes detected in profile form. Nothing to save.");
        this.successMessage = "No changes were made to save."; // Inform user
        this.cdRef.detectChanges(); // Make sure message shows
        setTimeout(() => this.successMessage = null, 3000);
        return; // Stop if nothing changed
      }

    // If valid and dirty, proceed with API call
    console.log("Profile form is valid and dirty. Proceeding with update...");
    this.isSaving = true; // Set saving state for button
    this.cdRef.detectChanges(); // Update view

    // Prepare payload - getRawValue includes disabled fields
    const profileData = this.profileForm.getRawValue();

    // **Adjust payload structure based on backend API expectations**
    // Assuming backend handles nested user/patient_details via PUT/PATCH /api/profile/
    console.log("Submitting updated profile data:", profileData);

    this.apiService.updateProfile(profileData)
      .pipe(
          finalize(() => {
              this.isSaving = false; // Reset saving state regardless of outcome
              this.cdRef.detectChanges(); // Update button state
              console.log("updateProfile API call finalized.");
          }),
          takeUntil(this.destroy$) // Unsubscribe on component destroy
      )
      .subscribe({
        next: (updatedProfile) => {
          console.log("Profile update SUCCESSFUL:", updatedProfile);
          this.successMessage = "Profile updated successfully!";
           // Update initial data state with the response from backend
           this.initialProfileData = JSON.parse(JSON.stringify(updatedProfile));
           // Re-patch the form with potentially processed data from backend
           this.patchForm(updatedProfile);
           // Mark form as pristine again after successful save
           this.profileForm.markAsPristine();
           // Optionally trigger a refresh of user info in AuthService if name/email could change global state
           // this.authService.fetchAndSetUserProfile().subscribe();
           this.cdRef.detectChanges(); // Ensure success message shows
           setTimeout(() => this.successMessage = null, 4000);
        },
        error: (err) => {
          console.error("Error updating profile:", err);
          // Parse and display error message
           if (err.error && typeof err.error === 'object') {
              let backendErrors = '';
              for (const key in err.error) { if (err.error.hasOwnProperty(key)) { const messages = Array.isArray(err.error[key]) ? err.error[key].join(', ') : err.error[key]; backendErrors += `- ${key.replace(/_/g, ' ')}: ${messages}\n`; } }
              this.errorMessage = `Update failed:\n${backendErrors.trim()}`;
           } else if (err.error?.detail) { this.errorMessage = err.error.detail; }
           else if(err.message) { this.errorMessage = `Update failed: ${err.message}`; }
           else { this.errorMessage = "Failed to update profile due to an unexpected error."; }
           this.cdRef.detectChanges(); // Ensure error message shows
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
   get emergency_contact_name(): AbstractControl | null { return this.profileForm.get('patient_details.emergency_contact_name'); }
   get emergency_contact_phone(): AbstractControl | null { return this.profileForm.get('patient_details.emergency_contact_phone'); }
   get emergency_contact_relationship(): AbstractControl | null { return this.profileForm.get('patient_details.emergency_contact_relationship'); }
}