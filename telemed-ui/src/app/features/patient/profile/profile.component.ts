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
  templateUrl: './profile.component.html', // Correct template URL
  styleUrls: ['./profile.component.scss']
})
export class PatientProfileComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  // Property to hold the loaded profile data, used in *ngIf
  initialProfileData: any = null;
  // Store initial snapshot separately ONLY if deep dirty checking is needed beyond Angular's default
  // private initialProfileDataSnapshot: any = null;
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
    this.profileForm.reset(); // Reset form before loading
    this.cdRef.detectChanges(); // Show loading spinner

    this.apiService.getProfile().pipe(
        tap(profile => console.log("SUCCESS: Profile data received:", profile)),
        catchError(err => {
            console.error("CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load profile data. Please try again.";
            this.initialProfileData = null; // Ensure initial data is null on error
            return of(null); // Return null observable
        }),
        finalize(() => {
            console.log("FINALIZE: Setting isLoading = false");
            this.isLoading = false;
            this.cdRef.detectChanges(); // Update view after loading finishes
        }),
        takeUntil(this.destroy$)
    ).subscribe({
        next: (profile) => {
          if (profile) { // Check if profile data was successfully received
              this.initialProfileData = profile; // <<< Assign fetched data HERE
              this.patchForm(profile); // Patch the form with received data
              this.profileForm.markAsPristine(); // Mark form as clean after patching
              console.log("Profile form patched and marked pristine.");
          } else {
              console.log("Profile data was null after API call (error handled). Form not patched.");
          }
        }
        // Error handled by catchError
    });
  }

  // Helper function to patch form values including nested groups
  private patchForm(profile: any): void {
       this.profileForm.patchValue({
         username: profile.user?.username, // Display only
         user_update: { // Patch nested group
             email: profile.user?.email,
             first_name: profile.user?.first_name,
             last_name: profile.user?.last_name,
         },
         phone_number: profile.phone_number,
         address: profile.address,
         date_of_birth: this.formatDateForInput(profile.date_of_birth),
         patient_details_update: { // Patch nested group
            emergency_contact_name: profile.details?.emergency_contact_name || '', // Use 'details' key from get_details
            emergency_contact_phone: profile.details?.emergency_contact_phone || '',
            emergency_contact_relationship: profile.details?.emergency_contact_relationship || ''
          }
       }, { emitEvent: false }); // Prevent patchValue triggering valueChanges unnecessarily
       // Mark as pristine AFTER patching is complete
        this.profileForm.markAsPristine();
        this.profileForm.markAsUntouched();
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

   // --- Debugging method for button click (Keep during debugging) ---
   onSaveButtonClick() {
       console.log('SAVE CHANGES BUTTON CLICKED!');
       console.log('Form valid on button click?', this.profileForm.valid);
       console.log('Form dirty on button click?', this.profileForm.dirty);
       // Log individual controls again right before potential submit
        console.log('--- Profile Control States on Click ---');
        Object.keys(this.profileForm.controls).forEach(key => { /* ... log controls ... */ });
        console.log('-------------------------------------');
   }

  // Handles form submission to update profile
  onSubmit(): void {
    console.log("Profile onSubmit CALLED");

    this.errorMessage = null;
    this.successMessage = null;
    this.profileForm.markAllAsTouched(); // Ensure errors display if invalid

    if (this.profileForm.invalid) {
      console.error("Profile Form IS INVALID. Halting submission.");
      this.errorMessage = "Please correct the errors highlighted in the form.";
      this.cdRef.detectChanges();
      return;
    }
    if (!this.profileForm.dirty) { // Use Angular's built-in dirty check
        console.warn("No changes detected in profile form (form not dirty). Nothing to save.");
        this.successMessage = "No changes were made to save.";
        this.cdRef.detectChanges();
        setTimeout(() => this.successMessage = null, 3000);
        return;
      }

    console.log("Profile form is valid and dirty. Proceeding with update...");
    this.isSaving = true;
    this.cdRef.detectChanges();

    // Construct payload matching the backend UserProfileSerializer write_only fields
    const profileDataPayload = {
        phone_number: this.profileForm.value.phone_number,
        address: this.profileForm.value.address,
        date_of_birth: this.profileForm.value.date_of_birth,
        user_update: this.profileForm.value.user_update, // Nested object for user fields
        patient_details_update: this.profileForm.value.patient_details_update // Nested object for patient fields
    };

    console.log("Submitting updated profile data:", profileDataPayload);

    this.apiService.updateProfile(profileDataPayload)
      .pipe(
          finalize(() => { this.isSaving = false; this.cdRef.detectChanges(); console.log("updateProfile API call finalized."); }),
          takeUntil(this.destroy$)
      )
      .subscribe({
        next: (updatedProfile) => {
          console.log("Profile update SUCCESSFUL:", updatedProfile);
          this.successMessage = "Profile updated successfully!";
           this.patchForm(updatedProfile); // Update form with response
           this.profileForm.markAsPristine(); // Mark clean again
           this.cdRef.detectChanges();
           setTimeout(() => this.successMessage = null, 4000);
        },
        error: (err) => { /* ... Error Handling ... */ }
      });
  }

   // --- Getters for template validation access ---
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