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
  isDataRendered = false; // Controls when the form *ngIf renders
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
    this.isLoading = true;
    this.isDataRendered = false; // Hide form
    this.errorMessage = null;
    this.successMessage = null;
    this.profileForm.reset({}, { emitEvent: false });
    this.profileForm.get('username')?.disable({ emitEvent: false });
    this.cdRef.detectChanges();

    this.profileSubscription?.unsubscribe();

    this.profileSubscription = this.apiService.getProfile().pipe(
        tap(profile => console.log("API Success:", profile)),
        catchError(err => {
            console.error("API CATCHERROR:", err);
            this.errorMessage = "Failed to load profile data.";
            this.isDataRendered = false;
            return of(null);
        }),
        finalize(() => {
            this.isLoading = false;
            console.log("API FINALIZE: isLoading=false");
            // Trigger CD AFTER isLoading is false, allowing template to potentially render form container
            this.cdRef.detectChanges();
        }),
        takeUntil(this.destroy$)
    ).subscribe({
        next: (profile) => {
          if (profile) {
              // Use setTimeout to slightly delay patching after finalize sets isLoading=false
              setTimeout(() => {
                  try {
                      this.patchForm(profile); // Patch values into the form
                      this.profileForm.markAsPristine();
                      this.profileForm.markAsUntouched();
                      this.isDataRendered = true; // NOW allow template *ngIf to show form
                      console.log("Form patched, isDataRendered=true.");
                      this.cdRef.detectChanges(); // Trigger CD again to show the patched form
                  } catch(patchError) {
                      console.error("ERROR during form patching:", patchError);
                      this.errorMessage = "Error displaying profile data.";
                      this.isDataRendered = false; // Keep form hidden
                      this.cdRef.detectChanges(); // Show error
                  }
              }, 0); // Zero delay timeout
          } else {
              // Error already handled by catchError, isLoading by finalize
              this.isDataRendered = false; // Ensure form stays hidden
              // No need for cdRef.detectChanges() here as finalize already did
          }
        },
        error: (err) => {
            // This usually won't run if catchError returns of(null)
            console.error("Subscription Error block:", err);
            this.errorMessage = this.errorMessage || "An unexpected error occurred.";
            this.isDataRendered = false;
            // No need for cdRef.detectChanges() here as finalize already did
        }
    });
  }

  // Patching logic (patching nested groups separately)
  private patchForm(profile: any): void {
       console.log("Patching form with data:", profile);
       this.profileForm.patchValue({
         username: profile?.user?.username ?? '',
         phone_number: profile?.phone_number ?? '',
         address: profile?.address ?? '',
         date_of_birth: this.formatDateForInput(profile?.date_of_birth),
       }, { emitEvent: false });
       const userUpdateGroup = this.profileForm.get('user_update') as FormGroup;
       if (userUpdateGroup && profile?.user) { userUpdateGroup.patchValue({ email: profile.user.email ?? '', first_name: profile.user.first_name ?? '', last_name: profile.user.last_name ?? '' }, { emitEvent: false }); }
       const patientDetailsGroup = this.profileForm.get('patient_details_update') as FormGroup;
       const patientDetailsData = profile?.patient_details ?? profile?.details;
       if (patientDetailsGroup && patientDetailsData) { patientDetailsGroup.patchValue({ emergency_contact_name: patientDetailsData.emergency_contact_name || '', emergency_contact_phone: patientDetailsData.emergency_contact_phone || '', emergency_contact_relationship: patientDetailsData.emergency_contact_relationship || '' }, { emitEvent: false }); }
       else { patientDetailsGroup?.reset({ emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '' }, { emitEvent: false }); }
       console.log('Form value AFTER patch:', this.profileForm.getRawValue());
  }

   // Helper to format date string
   formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null;
     try { const date = new Date(dateStr); if (isNaN(date.getTime())) return null; return date.toISOString().split('T')[0]; }
     catch (e) { return null; }
   }

   // Debugging method
   onSaveButtonClick() { /* ... */ }

  // Form Submission logic
  onSubmit(): void {
    // ... (Validation, dirty check, payload creation, API call) ...
     if (this.profileForm.invalid || !this.profileForm.dirty) { /* ... handle ... */ return; }
     this.isSaving = true; this.cdRef.detectChanges();
     const rawValue = this.profileForm.getRawValue();
     const profileDataPayload = { phone_number: rawValue.phone_number, address: rawValue.address, date_of_birth: rawValue.date_of_birth, user_update: rawValue.user_update, patient_details_update: rawValue.patient_details_update };
     this.apiService.updateProfile(profileDataPayload).pipe( finalize(() => { /* ... */ }), takeUntil(this.destroy$) ).subscribe({ next: updatedProfile => { /* ... */ }, error: err => { /* ... */ } });
  }

   // Getters for template
   get email() { return this.profileForm.get('user_update.email'); }
   get first_name() { return this.profileForm.get('user_update.first_name'); }
   get last_name() { return this.profileForm.get('user_update.last_name'); }
   get phone_number() { return this.profileForm.get('phone_number'); }
   get address() { return this.profileForm.get('address'); }
   get date_of_birth() { return this.profileForm.get('date_of_birth'); }
   get emergency_contact_name() { return this.profileForm.get('patient_details_update.emergency_contact_name'); }
   get emergency_contact_phone() { return this.profileForm.get('patient_details_update.emergency_contact_phone'); }
   get emergency_contact_relationship() { return this.profileForm.get('patient_details_update.emergency_contact_relationship'); }

   // Helper to log form errors
   private logFormErrors(group: FormGroup | AbstractControl | null, prefix = ''): void { /* ... */ }
   // Helper to parse backend errors
   private parseAndSetErrorMessage(err: any): void { /* ... */ }
}