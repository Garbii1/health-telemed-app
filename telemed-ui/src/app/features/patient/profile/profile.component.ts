// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, FormControl } from '@angular/forms'; // Import FormControl
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { finalize, Subject, of, Subscription } from 'rxjs';
import { catchError, takeUntil, tap } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule, LoadingSpinnerComponent ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class PatientProfileComponent implements OnInit, OnDestroy {
  profileForm!: FormGroup; // Use definite assignment assertion
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isDataRendered = false; // Controls template rendering
  private destroy$ = new Subject<void>();
  private profileSubscription: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private cdRef: ChangeDetectorRef,
    private zone: NgZone // Keep NgZone if using setTimeout approach
  ) {
    this.buildForm(); // Initialize form structure in constructor
  }

  // Method to initialize or re-initialize the complete form structure
  private buildForm(): void {
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
    console.log("Form rebuilt.");
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
      this.profileSubscription?.unsubscribe();
  }

  // --- Data Loading Method ---
  loadProfile(): void {
    console.log("loadProfile called");
    this.isLoading = true;
    this.isDataRendered = false; // Hide form
    this.errorMessage = null;
    this.successMessage = null;
    // Rebuild the form to ensure clean state instead of just reset
    this.buildForm();
    this.cdRef.detectChanges(); // Show loader

    this.profileSubscription?.unsubscribe(); // Cancel previous if exists

    this.profileSubscription = this.apiService.getProfile().pipe(
        tap(profile => console.log("API Success:", profile)),
        catchError(err => {
            console.error("API CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load profile data.";
            this.isDataRendered = false; // Keep form hidden on error
            return of(null);
        }),
        finalize(() => { // Manage isLoading in finalize for consistency
            this.isLoading = false;
            console.log("API FINALIZE: isLoading=false");
            this.cdRef.detectChanges(); // Update view after finalize runs
        }),
        takeUntil(this.destroy$)
    ).subscribe({
        next: (profile) => {
          // No need to set initialProfileData here if only isDataRendered controls view
          if (profile) {
              // Defer patch slightly using setTimeout (if needed, can remove if error is gone)
              // this.zone.runOutsideAngular(() => {
                // setTimeout(() => {
                 // this.zone.run(() => {
                     try {
                         this.patchFormAndResetNested(profile); // Call patching function
                         this.profileForm.markAsPristine();
                         this.profileForm.markAsUntouched();
                         this.isDataRendered = true; // Show form AFTER patching
                         console.log("Form patched, isDataRendered=true.");
                     } catch(patchError) {
                         console.error("ERROR during form patching:", patchError);
                         this.errorMessage = "Error displaying profile data correctly.";
                         this.isDataRendered = false;
                     }
                     // No need for detectChanges here if using finalize for isLoading
                  // }); // End zone.run
                // }, 0); // End setTimeout
              // }); // End runOutsideAngular
          } else {
              // Error handled by catchError, isLoading handled by finalize
              this.isDataRendered = false;
          }
        },
        error: (err) => { /* Error handled by catchError, finalize handles isLoading */ }
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

       // 2. Reset and Patch nested user_update group
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


       // 3. Reset and Patch nested patient_details_update group
       const patientDetailsGroup = this.profileForm.get('patient_details_update') as FormGroup;
       const patientDetailsData = profile?.patient_details ?? profile?.details;
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
                patientDetailsGroup.reset({ emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '' }, { emitEvent: false });
           }
        } else { console.warn("patient_details_update FormGroup missing."); } // Changed error to warn

       console.log('Form value AFTER patch:', this.profileForm.getRawValue());
       this.profileForm.get('username')?.disable({ emitEvent: false }); // Ensure username remains disabled
  }

  // Formats date for input[type=date]
  formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null;
     try { const date = new Date(dateStr); if (isNaN(date.getTime())) return null; return date.toISOString().split('T')[0]; }
     catch (e) { return null; }
   }

   // Debugging method
   onSaveButtonClick() {
       console.log('SAVE CHANGES BUTTON CLICKED!');
       console.log('Form valid:', this.profileForm.valid);
       console.log('Form dirty:', this.profileForm.dirty);
       if(this.profileForm.invalid) { this.logFormErrors(this.profileForm); }
   }

  // --- Form Submission ---
  onSubmit(): void {
    console.log("Profile onSubmit CALLED");
    this.errorMessage = null; this.successMessage = null;
    this.profileForm.markAllAsTouched();

    if (this.profileForm.invalid) { console.error("INVALID Form"); this.logFormErrors(this.profileForm); this.errorMessage = "..."; this.cdRef.detectChanges(); return; }
    if (!this.profileForm.dirty) { console.warn("UNCHANGED Form"); this.successMessage = "..."; this.cdRef.detectChanges(); setTimeout(() => this.successMessage = null, 3000); return; }

    console.log("VALID & DIRTY Form. Updating...");
    this.isSaving = true; this.cdRef.detectChanges();

    const rawValue = this.profileForm.getRawValue();
    const profileDataPayload = {
        phone_number: rawValue.phone_number, address: rawValue.address, date_of_birth: rawValue.date_of_birth,
        user_update: rawValue.user_update,
        patient_details_update: rawValue.patient_details_update
    };

    console.log("Submitting payload:", profileDataPayload);

    this.apiService.updateProfile(profileDataPayload)
      .pipe( finalize(() => { /* ... */ }), takeUntil(this.destroy$) )
      .subscribe({
        next: updatedProfile => {
          console.log("Update SUCCESS:", updatedProfile);
          this.successMessage = "Profile updated successfully!";
           // Use the CORRECT method name for patching after save
           this.patchFormAndResetNested(updatedProfile); // <<< CORRECTED METHOD CALL
           this.profileForm.markAsPristine();
           this.cdRef.detectChanges();
           setTimeout(() => this.successMessage = null, 4000);
        },
        error: err => { /* ... Error Handling ... */ }
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

   // --- Helper function to log form errors ---
   private logFormErrors(group: FormGroup | AbstractControl | null, prefix = ''): void {
       if (!group) return;
       if (group.errors) { Object.keys(group.errors).forEach(errorKey => { console.error(`${prefix}Group Error: ${errorKey} - ${JSON.stringify(group?.errors?.[errorKey])}`); }); }
       if (group instanceof FormGroup) { Object.keys(group.controls).forEach(key => { const control = group.get(key); if (control && control.invalid) { console.error(`${prefix}Control '${key}': Status=${control?.status}, Errors=${JSON.stringify(control?.errors)}`); } if (control instanceof FormGroup) { this.logFormErrors(control, `${prefix}${key}.`); } }); }
   }

    // --- Helper function to parse backend errors ---
    private parseAndSetErrorMessage(err: any): void {
        let displayError = 'Failed to update profile: An unexpected error occurred.'; // Default
        if (err.error && typeof err.error === 'object') { /* ... Parsing logic ... */ }
        else if (err.error?.detail) { displayError = err.error.detail; }
        else if(err.message) { displayError = `Update failed: ${err.message}`; }
        this.errorMessage = displayError;
    }
}