// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
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
  profileForm: FormGroup;
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isDataRendered = false; // Flag to control template rendering
  private destroy$ = new Subject<void>();
  private profileSubscription: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private cdRef: ChangeDetectorRef
  ) {
    // Initialize form structure
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

  loadProfile(): void {
    console.log("loadProfile called");
    this.isLoading = true; this.isDataRendered = false; this.errorMessage = null; this.successMessage = null;
    this.profileForm.reset({}, { emitEvent: false });
    this.profileForm.get('username')?.disable({ emitEvent: false });
    this.cdRef.detectChanges();

    this.profileSubscription?.unsubscribe();

    this.profileSubscription = this.apiService.getProfile().pipe(
        tap(profile => console.log("API Success:", profile)),
        catchError(err => { /* ... error handling ... */ return of(null); }),
        finalize(() => { // Finalize block to ensure isLoading is set false
             this.isLoading = false;
             console.log("API FINALIZE: isLoading=false");
             this.cdRef.detectChanges(); // Update UI after loading status changes
        }),
        takeUntil(this.destroy$)
    ).subscribe({
        next: (profile) => {
          if (profile) {
              try {
                  this.patchFormAndUpdateValidity(profile); // Call the patch method
                  this.profileForm.markAsPristine();
                  this.profileForm.markAsUntouched();
                  this.isDataRendered = true; // Show form AFTER successful patch & validity update
                  console.log("Form patched, validity updated, isDataRendered=true.");
              } catch(patchError) {
                  console.error("ERROR during form patching/validity update:", patchError);
                  this.errorMessage = "Error displaying profile data correctly.";
                  this.isDataRendered = false; // Keep form hidden on error
              }
          } else {
              // Error handled by catchError, isLoading handled by finalize
              this.isDataRendered = false;
          }
          // No need for detectChanges here if finalize handles it
        },
        error: (err) => { /* Error handled by catchError, finalize handles isLoading */ }
    });
  }

  // Patching logic + Manual Validity Update
  private patchFormAndUpdateValidity(profile: any): void {
       console.log("Patching form and updating validity:", profile);

       // 1. Patch all values using single patchValue for simplicity (reverted from separate patching)
       this.profileForm.patchValue({
         username: profile?.user?.username ?? '',
         // Include nested groups directly if patchValue handles them
         user_update: {
             email: profile?.user?.email ?? '',
             first_name: profile?.user?.first_name ?? '',
             last_name: profile?.user?.last_name ?? '',
         },
         phone_number: profile?.phone_number ?? '',
         address: profile?.address ?? '',
         date_of_birth: this.formatDateForInput(profile?.date_of_birth),
         patient_details_update: {
             // Check both keys from backend possibilities
             emergency_contact_name: profile?.patient_details?.emergency_contact_name || profile?.details?.emergency_contact_name || '',
             emergency_contact_phone: profile?.patient_details?.emergency_contact_phone || profile?.details?.emergency_contact_phone || '',
             emergency_contact_relationship: profile?.patient_details?.emergency_contact_relationship || profile?.details?.emergency_contact_relationship || ''
         }
       }, { emitEvent: false }); // Patch without emitting valueChanges

       // 2. **Manually trigger validity update for the entire form**
       // This forces Angular to re-check validators AFTER patching
       console.log("Manually calling updateValueAndValidity...");
       this.profileForm.updateValueAndValidity({ emitEvent: false }); // Recalculate validity state silently

       console.log("Form value AFTER patch and validity update:", this.profileForm.getRawValue());
       console.log("Form status AFTER patch and validity update:", this.profileForm.status);

       // Re-disable username control AFTER patching and validity update, just in case
        this.profileForm.get('username')?.disable({ emitEvent: false });
  }


   formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null;
     try { const date = new Date(dateStr); if (isNaN(date.getTime())) return null; return date.toISOString().split('T')[0]; }
     catch (e) { return null; }
   }

   onSaveButtonClick() {
       console.log('SAVE CHANGES BUTTON CLICKED!');
       console.log('Form valid on button click?', this.profileForm.valid);
       console.log('Form dirty on button click?', this.profileForm.dirty);
       if(this.profileForm.invalid) { this.logFormErrors(this.profileForm); }
   }

  onSubmit(): void {
    console.log("Profile onSubmit CALLED");
    this.errorMessage = null; this.successMessage = null;
    this.profileForm.markAllAsTouched();

    if (this.profileForm.invalid) { console.error("INVALID Form"); this.logFormErrors(this.profileForm); this.errorMessage = "..."; this.cdRef.detectChanges(); return; }
    if (!this.profileForm.dirty) { console.warn("UNCHANGED Form"); this.successMessage = "..."; this.cdRef.detectChanges(); setTimeout(() => this.successMessage = null, 3000); return; }

    console.log("VALID & DIRTY Form. Updating...");
    this.isSaving = true; this.cdRef.detectChanges();

    const rawValue = this.profileForm.getRawValue();
    // Construct payload matching backend serializer's write_only fields
    const profileDataPayload = {
        phone_number: rawValue.phone_number, address: rawValue.address, date_of_birth: rawValue.date_of_birth,
        user_update: rawValue.user_update,
        patient_details_update: rawValue.patient_details_update
    };

    console.log("Submitting payload:", profileDataPayload);

    this.apiService.updateProfile(profileDataPayload)
      .pipe( finalize(() => { this.isSaving = false; this.cdRef.detectChanges(); }), takeUntil(this.destroy$) )
      .subscribe({
        next: updatedProfile => {
          console.log("Update SUCCESS:", updatedProfile);
          this.successMessage = "Profile updated successfully!";
           this.patchFormAndUpdateValidity(updatedProfile); // Re-patch with response
           this.profileForm.markAsPristine(); // Mark clean after save
           this.cdRef.detectChanges();
           setTimeout(() => this.successMessage = null, 4000);
        },
        error: err => { this.parseAndSetErrorMessage(err); this.cdRef.detectChanges(); }
      });
  }

   // Getters for template access
   get email() { return this.profileForm.get('user_update.email'); }
   get first_name() { return this.profileForm.get('user_update.first_name'); }
   get last_name() { return this.profileForm.get('user_update.last_name'); }
   get phone_number() { return this.profileForm.get('phone_number'); }
   get address() { return this.profileForm.get('address'); }
   get date_of_birth() { return this.profileForm.get('date_of_birth'); }
   get emergency_contact_name() { return this.profileForm.get('patient_details_update.emergency_contact_name'); }
   get emergency_contact_phone() { return this.profileForm.get('patient_details_update.emergency_contact_phone'); }
   get emergency_contact_relationship() { return this.profileForm.get('patient_details_update.emergency_contact_relationship'); }

   // Helper function to log form errors
   private logFormErrors(group: FormGroup | AbstractControl | null, prefix = ''): void {
       if (!group) return;
       if (group.errors) { Object.keys(group.errors).forEach(errorKey => { console.error(`${prefix}Group Error: ${errorKey} - ${JSON.stringify(group?.errors?.[errorKey])}`); }); }
       if (group instanceof FormGroup) { Object.keys(group.controls).forEach(key => { const control = group.get(key); if (control && control.invalid) { console.error(`${prefix}Control '${key}': Status=${control?.status}, Errors=${JSON.stringify(control?.errors)}`); } if (control instanceof FormGroup) { this.logFormErrors(control, `${prefix}${key}.`); } }); }
   }

    // Helper function to parse backend errors
    private parseAndSetErrorMessage(err: any): void {
        let displayError = 'Failed to update profile due to an unexpected error.';
        if (err.error && typeof err.error === 'object') { /* ... parsing logic ... */ }
        else if (err.error?.detail) { displayError = err.error.detail; }
        else if(err.message) { displayError = `Update failed: ${err.message}`; }
        this.errorMessage = displayError;
    }
}