// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
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
  // Use a flag to control *ngIf rendering, set AFTER data is successfully patched
  isDataRendered = false;
  private destroy$ = new Subject<void>();
  private profileSubscription: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private cdRef: ChangeDetectorRef,
    private zone: NgZone // Inject NgZone
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
    this.isDataRendered = false; // Hide form while loading
    this.errorMessage = null;
    this.successMessage = null;
    // Reset silently before fetching
    this.profileForm.reset({}, { emitEvent: false });
    this.profileForm.get('username')?.disable({ emitEvent: false });
    this.cdRef.detectChanges(); // Show loader

    this.profileSubscription?.unsubscribe();

    this.profileSubscription = this.apiService.getProfile().pipe(
        tap(profile => console.log("API Success:", profile)),
        catchError(err => {
            console.error("API CATCHERROR:", err);
            this.errorMessage = "Failed to load profile data.";
            this.isDataRendered = false; // Keep form hidden
            return of(null);
        }),
        finalize(() => { // Ensure loading is set false eventually
            this.isLoading = false;
            console.log("API FINALIZE: isLoading=false");
            // Trigger CD after finalize ensures loading state is updated
            this.cdRef.detectChanges();
        }),
        takeUntil(this.destroy$)
    ).subscribe({
        next: (profile) => {
          // No need to set initialProfileData if only isDataRendered controls view
          if (profile) {
              // Defer patch slightly
              this.zone.runOutsideAngular(() => { // Try running patch outside zone initially
                setTimeout(() => {
                  this.zone.run(() => { // Re-enter zone for patching and subsequent CD
                     try {
                         this.patchFormAndResetNested(profile); // Call new patching function
                         this.profileForm.markAsPristine();
                         this.profileForm.markAsUntouched();
                         this.isDataRendered = true; // Show form AFTER patching
                         console.log("Form patched, isDataRendered=true.");
                         // No need for detectChanges here as we are inside zone.run
                     } catch(patchError) {
                         console.error("ERROR during form patching:", patchError);
                         this.errorMessage = "Error displaying profile data.";
                         this.isDataRendered = false;
                         this.cdRef.detectChanges(); // Trigger CD on error inside timeout
                     }
                  });
                }, 0);
              });
          } else {
              // Error handled by catchError, finalize handles isLoading
              this.isDataRendered = false;
          }
        },
        error: (err) => { /* Error handled by catchError, finalize handles isLoading */ }
    });
  }

  // Revised Patching: Reset nested groups explicitly before patching
  private patchFormAndResetNested(profile: any): void {
       console.log("Patching form (resetting nested first):", profile);

       // Patch top-level fields
       this.profileForm.patchValue({
         username: profile?.user?.username ?? '',
         phone_number: profile?.phone_number ?? '',
         address: profile?.address ?? '',
         date_of_birth: this.formatDateForInput(profile?.date_of_birth),
       }, { emitEvent: false });

       // Reset and Patch nested user_update group
       const userUpdateGroup = this.profileForm.get('user_update') as FormGroup;
       if (userUpdateGroup) {
           userUpdateGroup.reset({}, { emitEvent: false }); // Reset nested group
           if (profile?.user) {
               console.log("Patching user_update:", profile.user);
               userUpdateGroup.patchValue({
                   email: profile.user.email ?? '',
                   first_name: profile.user.first_name ?? '',
                   last_name: profile.user.last_name ?? '',
               }, { emitEvent: false });
           } else { console.warn("User data missing for user_update patch."); }
       } else { console.error("user_update FormGroup not found!"); }


       // Reset and Patch nested patient_details_update group
       const patientDetailsGroup = this.profileForm.get('patient_details_update') as FormGroup;
       const patientDetailsData = profile?.patient_details ?? profile?.details;
       if (patientDetailsGroup) {
            patientDetailsGroup.reset({ // Reset nested group first
                emergency_contact_name: '',
                emergency_contact_phone: '',
                emergency_contact_relationship: ''
            }, { emitEvent: false });
            if (patientDetailsData) {
                console.log("Patching patient_details_update using:", patientDetailsData);
                patientDetailsGroup.patchValue({
                    emergency_contact_name: patientDetailsData.emergency_contact_name || '',
                    emergency_contact_phone: patientDetailsData.emergency_contact_phone || '',
                    emergency_contact_relationship: patientDetailsData.emergency_contact_relationship || ''
                }, { emitEvent: false });
           } else { console.warn("Patient details data missing for patient_details_update patch."); }
       } else { console.error("patient_details_update FormGroup not found!"); }

       console.log('Form value AFTER patch:', this.profileForm.getRawValue());
  }


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

  // Form Submission logic
  onSubmit(): void {
     console.log("Profile onSubmit CALLED");
     this.errorMessage = null; this.successMessage = null;
     this.profileForm.markAllAsTouched();
     if (this.profileForm.invalid) { console.error("Profile Form IS INVALID."); this.logFormErrors(this.profileForm); this.errorMessage = "..."; this.cdRef.detectChanges(); return; }
     if (!this.profileForm.dirty) { console.warn("No changes detected."); this.successMessage = "..."; this.cdRef.detectChanges(); setTimeout(() => this.successMessage = null, 3000); return; }

     console.log("Profile form valid & dirty. Updating...");
     this.isSaving = true; this.cdRef.detectChanges();
     const rawValue = this.profileForm.getRawValue();
     const profileDataPayload = { /* ... construct payload ... */ };
     console.log("Submitting updated profile data:", profileDataPayload);
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

   // Helper function to log form errors
   private logFormErrors(group: FormGroup | AbstractControl | null, prefix = ''): void { /* ... */ }
   // Helper function to parse backend errors
   private parseAndSetErrorMessage(err: any): void { /* ... */ }
}