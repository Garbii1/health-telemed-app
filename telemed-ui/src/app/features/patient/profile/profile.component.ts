// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { finalize, Subject, of } from 'rxjs';
import { catchError, takeUntil, tap } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

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
  profileForm: FormGroup;
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  initialProfileData: any = null; // Used for *ngIf in template
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private cdRef: ChangeDetectorRef
  ) {
    // Initialize the complete form structure
    this.profileForm = this.fb.group({
      username: [{value: '', disabled: true}],
      user_update: this.fb.group({
          email: ['', [Validators.required, Validators.email]],
          first_name: ['', Validators.required],
          last_name: ['', Validators.required]
      }),
      phone_number: ['', Validators.required],
      address: ['', Validators.required],
      date_of_birth: ['', Validators.required],
      patient_details_update: this.fb.group({
        emergency_contact_name: [''],
        emergency_contact_phone: [''],
        emergency_contact_relationship: ['']
      })
    });
  }

  // --- Lifecycle Hooks ---
  ngOnInit(): void {
    console.log("PatientProfile OnInit");
    this.loadProfile();
  }

  ngOnDestroy(): void {
      console.log("PatientProfile OnDestroy");
      this.destroy$.next();
      this.destroy$.complete();
  }

  // --- Data Loading ---
  loadProfile(): void {
    console.log("loadProfile called");
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.initialProfileData = null; // Hide form while loading
    this.profileForm.reset({}, { emitEvent: false }); // Reset form silently
    this.profileForm.get('username')?.disable({ emitEvent: false });
    this.cdRef.detectChanges(); // Show loader

    this.apiService.getProfile().pipe(
        tap(profile => console.log("API Success: Profile data received:", profile)),
        catchError(err => {
            console.error("API CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load profile data.";
            this.initialProfileData = null; // Ensure form remains hidden
            return of(null); // Continue stream for finalize
        }),
        finalize(() => { // Ensure loading state is always turned off
            console.log("API FINALIZE: Setting isLoading = false");
            this.isLoading = false;
            this.cdRef.detectChanges(); // Update view to hide loader / show error/form
        }),
        takeUntil(this.destroy$) // Unsubscribe on component destroy
    ).subscribe({
        next: (profile) => {
          // Assign data AFTER loading is false (set in finalize)
          this.initialProfileData = profile; // Allows *ngIf to show the form

          if (profile) {
              try {
                this.patchForm(profile); // Populate form controls
                this.profileForm.markAsPristine(); // Set initial state
                this.profileForm.markAsUntouched();
                console.log("Profile form patched and marked pristine/untouched.");
              } catch (patchError) {
                 console.error("ERROR during form patching:", patchError);
                 this.errorMessage = "Error displaying profile data correctly.";
                 this.initialProfileData = null; // Hide form if patching fails
              }
          } else {
              // Error occurred, message already set by catchError
              console.log("Profile data was null (error handled).");
          }
          // Final CD call after all processing in next/error/finalize
          this.cdRef.detectChanges();
        }
        // No separate error block needed here due to catchError
    });
  }

  // --- Helper Methods ---

  // Patches form values defensively
  private patchForm(profile: any): void {
       console.log("Patching form with data:", profile);
       // Patch top-level fields
       this.profileForm.patchValue({
         username: profile?.user?.username ?? '',
         phone_number: profile?.phone_number ?? '',
         address: profile?.address ?? '',
         date_of_birth: this.formatDateForInput(profile?.date_of_birth),
       }, { emitEvent: false });

       // Patch nested user_update group
       const userUpdateGroup = this.profileForm.get('user_update') as FormGroup;
       if (userUpdateGroup && profile?.user) {
           userUpdateGroup.patchValue({ /* user fields */ }, { emitEvent: false });
       }

       // Patch nested patient_details_update group
       const patientDetailsGroup = this.profileForm.get('patient_details_update') as FormGroup;
       const patientDetailsData = profile?.patient_details ?? profile?.details;
       if (patientDetailsGroup && patientDetailsData) {
           patientDetailsGroup.patchValue({ /* patient details */ }, { emitEvent: false });
       } else {
           patientDetailsGroup?.reset({ /* empty values */ }, { emitEvent: false });
       }
       console.log('Form value AFTER patch:', this.profileForm.getRawValue());
  }

   // Formats date for input[type=date]
   formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null;
     try {
       const date = new Date(dateStr);
       if (isNaN(date.getTime())) return null;
       return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
     } catch (e) { return null; }
   }

   // Debugging method
   onSaveButtonClick() {
       console.log('SAVE CHANGES BUTTON CLICKED!');
       console.log('Form valid:', this.profileForm.valid);
       console.log('Form dirty:', this.profileForm.dirty);
       if(this.profileForm.invalid) {
           this.logFormErrors(this.profileForm);
       }
   }

  // --- Form Submission ---
  onSubmit(): void {
    console.log("Profile onSubmit CALLED");
    this.errorMessage = null; this.successMessage = null;
    this.profileForm.markAllAsTouched();

    if (this.profileForm.invalid) { /* Log errors, set message, return */ }
    if (!this.profileForm.dirty) { /* Show message, return */ }

    console.log("Profile form valid & dirty. Updating...");
    this.isSaving = true;
    this.cdRef.detectChanges();

    const rawValue = this.profileForm.getRawValue();
    const profileDataPayload = { /* Construct payload with nested objects */ };

    this.apiService.updateProfile(profileDataPayload)
      .pipe(
          finalize(() => { this.isSaving = false; this.cdRef.detectChanges(); }),
          takeUntil(this.destroy$)
      )
      .subscribe({
        next: (updatedProfile) => { /* Handle success, patchForm, markAsPristine */ },
        error: (err) => { /* Handle error, parseAndSetErrorMessage */ }
      });
  }

   // --- Getters for Template Access ---
   get email() { return this.profileForm.get('user_update.email'); }
   get first_name() { return this.profileForm.get('user_update.first_name'); }
   get last_name() { return this.profileForm.get('user_update.last_name'); }
   get phone_number() { return this.profileForm.get('phone_number'); }
   get address() { return this.profileForm.get('address'); }
   get date_of_birth() { return this.profileForm.get('date_of_birth'); }
   get emergency_contact_name() { return this.profileForm.get('patient_details_update.emergency_contact_name'); }
   get emergency_contact_phone() { return this.profileForm.get('patient_details_update.emergency_contact_phone'); }
   get emergency_contact_relationship() { return this.profileForm.get('patient_details_update.emergency_contact_relationship'); }

   // --- Helper function to log form errors (for debugging) ---
   private logFormErrors(group: FormGroup | AbstractControl | null, prefix = ''): void { /* ... */ }

    // --- Helper function to parse backend errors ---
    private parseAndSetErrorMessage(err: any): void { /* ... */ }
}