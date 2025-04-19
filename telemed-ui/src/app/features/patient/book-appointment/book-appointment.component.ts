// src/app/features/patient/book-appointment/book-appointment.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.scss']
})
export class BookAppointmentComponent implements OnInit, OnDestroy {
  appointmentForm: FormGroup;
  doctors: any[] = []; // Store doctors array directly
  isLoadingDoctors = true;
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  minDateTime: string = '';
  private destroy$ = new Subject<void>();
  private doctorsSubscription: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) {
    // Initialize form in constructor for definite assignment
    this.appointmentForm = this.fb.group({
      doctor_id: ['', Validators.required],
      appointment_time: ['', Validators.required], // Browser handles datetime-local validation mostly
      reason: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    console.log("BookAppointment OnInit");
    this.setMinDateTime(); // Set min value for date picker
    this.loadDoctors(); // Load doctors list
  }

  ngOnDestroy(): void {
      console.log("BookAppointment OnDestroy");
      this.destroy$.next();
      this.destroy$.complete();
      this.doctorsSubscription?.unsubscribe();
  }

  // Sets the minimum value for the datetime-local input to now
  setMinDateTime(): void {
     const now = new Date();
     // Adjust for local timezone offset
     const offset = now.getTimezoneOffset() * 60000; // Offset in milliseconds
     const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
     this.minDateTime = localISOTime;
     console.log("Min DateTime set to:", this.minDateTime);
  }

  // Fetches the list of available doctors
  loadDoctors(): void {
    console.log("loadDoctors called");
    this.isLoadingDoctors = true;
    this.errorMessage = null; // Clear previous doctor loading errors
    this.doctors = []; // Clear existing doctors
    this.cdRef.detectChanges(); // Trigger loading state view

    this.doctorsSubscription?.unsubscribe(); // Cancel previous request if any

    console.log("Subscribing to apiService.getDoctors()");
    this.doctorsSubscription = this.apiService.getDoctors().pipe(
      tap(
        (doctors) => console.log("SUCCESS: Doctors data received in pipe:", doctors),
        (error) => console.error("ERROR: Error received in pipe:", error),
        () => console.log("COMPLETE: getDoctors observable completed")
      ),
      catchError(err => {
        console.error("CATCHERROR: Error loading doctors:", err);
        this.errorMessage = "Could not load available doctors. Please try again later.";
        return of([]); // Return empty array on error
      }),
      finalize(() => {
          console.log("FINALIZE: Setting isLoadingDoctors = false");
          this.isLoadingDoctors = false;
          this.cdRef.detectChanges(); // Ensure UI update after loading finishes
      }),
      takeUntil(this.destroy$)
    ).subscribe(
        data => {
            console.log("SUBSCRIBE/NEXT: Assigning doctors data");
            this.doctors = data; // Assign the received data
        }
        // Error handling done in catchError
    );
  }

  // Handles the form submission to book an appointment
  onSubmit(): void {
    console.log('Book Appointment onSubmit CALLED');

    console.log('Appointment Form Value:', this.appointmentForm.value);
    console.log('Appointment Form Status:', this.appointmentForm.status);
    console.log('Is Appointment Form Valid?:', this.appointmentForm.valid);

    console.log('--- Appointment Control Validity ---');
    Object.keys(this.appointmentForm.controls).forEach(key => {
      const control = this.appointmentForm.get(key);
      console.log(`${key}: Status=${control?.status}, Value='${control?.value}', Errors=${JSON.stringify(control?.errors)}, Touched=${control?.touched}`);
    });
    console.log('---------------------------------');

    this.errorMessage = null; // Clear previous submission errors
    this.successMessage = null;

    this.appointmentForm.markAllAsTouched(); // Show validation errors

    if (this.appointmentForm.invalid) {
      console.error("Appointment Form IS INVALID. Halting submission.");
      this.errorMessage = "Please select a doctor and a valid future date/time.";
      return;
    }

    // Client-side check for past date (backend should also validate)
    const selectedDateTime = this.appointmentForm.value.appointment_time;
    if (selectedDateTime && new Date(selectedDateTime) <= new Date()) {
         console.error("Selected time is in the past.");
         this.appointmentForm.get('appointment_time')?.setErrors({ pastDate: true });
         this.errorMessage = "Cannot book an appointment in the past.";
         return;
     }

    console.log('Appointment Form IS VALID. Proceeding with API call...');
    this.isSubmitting = true;

    const appointmentData = {
        doctor_id: Number(this.appointmentForm.value.doctor_id), // Ensure it's a number
        // Ensure datetime string is ISO-like format (YYYY-MM-DDTHH:mm)
        appointment_time: this.appointmentForm.value.appointment_time,
        reason: this.appointmentForm.value.reason || ''
    };
    console.log("Submitting appointment data:", appointmentData); // Log payload

    this.apiService.bookAppointment(appointmentData)
      .pipe(
          finalize(() => {
              this.isSubmitting = false;
              this.cdRef.detectChanges(); // Ensure button state updates
              console.log("bookAppointment API call finalized."); // Log finalize
          }),
          takeUntil(this.destroy$) // Unsubscribe on destroy
      )
      .subscribe({
        next: (response) => {
          console.log("Appointment booked successfully:", response);
          this.successMessage = "Appointment booked successfully! Redirecting...";
          this.appointmentForm.reset(); // Clear form on success
          setTimeout(() => {
             this.router.navigate(['/patient/appointments']); // Redirect after delay
          }, 2500);
        },
        error: (err) => {
          console.error("Error booking appointment API call:", err);
          // Parse backend error if possible
          if (err.error && typeof err.error === 'object') {
             let backendErrors = '';
             for (const key in err.error) {
                 if (err.error.hasOwnProperty(key)) {
                    const messages = Array.isArray(err.error[key]) ? err.error[key].join(', ') : err.error[key];
                    // Prepend field name for context
                    backendErrors += `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${messages}\n`;
                 }
             }
             this.errorMessage = `Booking failed:\n${backendErrors.trim()}`;
          } else if (err.error?.detail) {
             this.errorMessage = err.error.detail;
          } else if(err.message) {
              this.errorMessage = `Booking failed: ${err.message}`;
          } else {
              this.errorMessage = 'Failed to book appointment due to an unexpected error.';
          }
        }
      });
  }

    // Getters for template validation access
    get doctor_id(): AbstractControl | null { return this.appointmentForm.get('doctor_id'); }
    get appointment_time(): AbstractControl | null { return this.appointmentForm.get('appointment_time'); }
    get reason(): AbstractControl | null { return this.appointmentForm.get('reason'); }
}