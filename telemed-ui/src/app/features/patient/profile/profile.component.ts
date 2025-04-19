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
  templateUrl: './profile.component.html', // <<< Ensure this points to the correct file
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
    private authService: AuthService,
    private cdRef: ChangeDetectorRef
  ) {
    // Initialize the form structure
    this.profileForm = this.fb.group({
      username: [{value: '', disabled: true}],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phone_number: ['', Validators.required],
      address: ['', Validators.required],
      date_of_birth: ['', Validators.required],
      patient_details: this.fb.group({
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

  loadProfile(): void {
    console.log("loadProfile called");
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.cdRef.detectChanges();

    this.apiService.getProfile().pipe(
        tap(profile => console.log("SUCCESS: Profile data received:", profile)),
        catchError(err => {
            console.error("CATCHERROR: Error loading profile:", err);
            this.errorMessage = "Failed to load profile data. Please try again.";
            return of(null);
        }),
        finalize(() => {
            console.log("FINALIZE: Setting isLoading = false");
            this.isLoading = false;
            this.cdRef.detectChanges();
        }),
        takeUntil(this.destroy$)
    ).subscribe({
        next: (profile) => {
          if (profile) {
              this.initialProfileData = JSON.parse(JSON.stringify(profile));
              this.patchForm(profile);
              this.profileForm.markAsPristine();
              console.log("Profile form patched and marked pristine.");
          } else {
              console.log("Profile data was null after API call (error handled by catchError).");
          }
        }
    });
  }

  private patchForm(profile: any): void {
    this.profileForm.patchValue({
      username: profile.user?.username,
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

   formatDateForInput(dateStr: string | null): string | null {
     if (!dateStr) return null;
     try { const date = new Date(dateStr); if (isNaN(date.getTime())) return null; const year = date.getFullYear(); const month = (date.getMonth() + 1).toString().padStart(2, '0'); const day = date.getDate().toString().padStart(2, '0'); return `${year}-${month}-${day}`; } catch (e) { return null; }
   }

  // --- Debugging method for button click ---
  onSaveButtonClick() {
    console.log('SAVE CHANGES BUTTON CLICKED!');
    console.log('Form valid on button click?', this.profileForm.valid);
    console.log('Form dirty on button click?', this.profileForm.dirty);
    // Intentionally does NOT submit, just logs
  }

  onSubmit(): void {
    console.log("Profile onSubmit CALLED"); // Check if ngSubmit triggers this

    // Log form state before checks
    console.log('Profile Form Value:', this.profileForm.getRawValue());
    console.log('Profile Form Status:', this.profileForm.status);
    console.log('Is Profile Form Valid?:', this.profileForm.valid);
    console.log('Is Profile Form Dirty?:', this.profileForm.dirty);

    if (!this.profileForm.valid || !this.profileForm.dirty) { /* Log controls if needed */ }

    this.errorMessage = null;
    this.successMessage = null;
    this.profileForm.markAllAsTouched();

    if (this.profileForm.invalid) {
      console.error("Profile Form IS INVALID. Halting submission.");
      this.errorMessage = "Please correct the errors highlighted in the form.";
      this.cdRef.detectChanges();
      return;
    }
    if (!this.profileForm.dirty) {
        console.warn("No changes detected in profile form. Nothing to save.");
        this.successMessage = "No changes were made to save.";
        this.cdRef.detectChanges();
        setTimeout(() => this.successMessage = null, 3000);
        return;
      }

    console.log("Profile form is valid and dirty. Proceeding with update...");
    this.isSaving = true;
    this.cdRef.detectChanges();

    const profileData = this.profileForm.getRawValue();
    console.log("Submitting updated profile data:", profileData);

    this.apiService.updateProfile(profileData)
      .pipe(
          finalize(() => { this.isSaving = false; this.cdRef.detectChanges(); console.log("updateProfile API call finalized."); }),
          takeUntil(this.destroy$)
      )
      .subscribe({
        next: (updatedProfile) => {
          console.log("Profile update SUCCESSFUL:", updatedProfile);
          this.successMessage = "Profile updated successfully!";
           this.initialProfileData = JSON.parse(JSON.stringify(updatedProfile));
           this.patchForm(updatedProfile); // Re-patch to ensure consistency
           this.profileForm.markAsPristine();
           // Optionally re-fetch user info in AuthService
           // this.authService.fetchAndSetUserProfile().subscribe();
           this.cdRef.detectChanges();
           setTimeout(() => this.successMessage = null, 4000);
        },
        error: (err) => { /* ... Error Handling ... */ }
      });
  }

   // Getters
   get email(): AbstractControl | null { return this.profileForm.get('email'); }
   get first_name(): AbstractControl | null { return this.profileForm.get('first_name'); }
   get last_name(): AbstractControl | null { return this.profileForm.get('last_name'); }
   get phone_number(): AbstractControl | null { return this.profileForm.get('phone_number'); }
   get address(): AbstractControl | null { return this.profileForm.get('address'); }
   get date_of_birth(): AbstractControl | null { return this.profileForm.get('date_of_birth'); }
   get emergency_contact_name(): AbstractControl | null { return this.profileForm.get('patient_details.emergency_contact_name'); }
   get emergency_contact_phone(): AbstractControl | null { return this.profileForm.get('patient_details.emergency_contact_phone'); }
   get emergency_contact_relationship(): AbstractControl | null { return this.profileForm.get('patient_details.emergency_contact_relationship');}
}