// src/app/features/patient/book-appointment/book-appointment.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service'; // Import AuthService
import { Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, finalize, tap, takeUntil, first } from 'rxjs/operators'; // Import first
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule, LoadingSpinnerComponent ],
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.scss']
})
export class BookAppointmentComponent implements OnInit, OnDestroy {
  appointmentForm: FormGroup;
  doctors: any[] = [];
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
    private authService: AuthService, // Inject AuthService
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) {
    // Initialize form
    this.appointmentForm = this.fb.group({
      doctor_id: ['', Validators.required],
      appointment_time: ['', Validators.required],
      reason: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    console.log("BookAppointment OnInit");
    this.setMinDateTime();
    this.loadDoctors();
  }

  ngOnDestroy(): void {
      console.log("BookAppointment OnDestroy");
      this.destroy$.next();
      this.destroy$.complete();
      this.doctorsSubscription?.unsubscribe();
  }

  setMinDateTime(): void {
     const now = new Date();
     const offset = now.getTimezoneOffset() * 60000;
     const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
     this.minDateTime = localISOTime;
  }

  loadDoctors(): void {
    console.log("loadDoctors called");
    this.isLoadingDoctors = true;
    this.errorMessage = null;
    this.doctors = [];
    this.cdRef.detectChanges();
    this.doctorsSubscription?.unsubscribe();

    console.log("Subscribing to apiService.getDoctors()");
    this.doctorsSubscription = this.apiService.getDoctors().pipe(
      tap(doctors => console.log("SUCCESS: Doctors data received in pipe:", doctors)),
      catchError(err => { console.error("CATCHERROR: Error loading doctors:", err); this.errorMessage = "Could not load available doctors."; return of([]); }),
      finalize(() => { console.log("FINALIZE: Setting isLoadingDoctors = false"); this.isLoadingDoctors = false; this.cdRef.detectChanges(); }),
      takeUntil(this.destroy$)
    ).subscribe( data => { console.log("SUBSCRIBE/NEXT: Assigning doctors data"); this.doctors = data; });
  }

  onSubmit(): void {
    console.log('Book Appointment onSubmit CALLED');
    console.log('Form Status:', this.appointmentForm.status);

    this.errorMessage = null;
    this.successMessage = null;
    this.appointmentForm.markAllAsTouched();

    if (this.appointmentForm.invalid) {
      console.error("Appointment Form IS INVALID.");
      this.errorMessage = "Please select a doctor and a valid future date/time.";
      return;
    }

    const selectedDateTime = this.appointmentForm.value.appointment_time;
    if (selectedDateTime && new Date(selectedDateTime) <= new Date()) {
         console.error("Selected time is in the past.");
         this.appointmentForm.get('appointment_time')?.setErrors({ pastDate: true });
         this.errorMessage = "Cannot book an appointment in the past.";
         return;
     }

    // Get Patient ID before submitting
    this.authService.currentUser$.pipe(first(), takeUntil(this.destroy$)).subscribe(currentUser => {
        if (!currentUser || !currentUser.id) {
            console.error("Cannot book appointment: Patient ID not found.");
            this.errorMessage = "Could not identify current user. Please login again.";
            this.isSubmitting = false; // Ensure loading is stopped if it started
            this.cdRef.detectChanges();
            return;
        }

        const patientId = currentUser.id;
        console.log('Appointment Form IS VALID. Proceeding with API call...');
        this.isSubmitting = true;
        this.cdRef.detectChanges();

        // Create payload including patient_id
        const appointmentData = {
            doctor_id: Number(this.appointmentForm.value.doctor_id),
            appointment_time: this.appointmentForm.value.appointment_time,
            reason: this.appointmentForm.value.reason || '',
            patient_id: patientId // <<< Include patient_id
        };
        console.log("Submitting appointment data:", appointmentData);

        this.apiService.bookAppointment(appointmentData)
          .pipe(
              finalize(() => {
                  this.isSubmitting = false;
                  this.cdRef.detectChanges();
                  console.log("bookAppointment API call finalized.");
              }),
              takeUntil(this.destroy$)
          )
          .subscribe({
            next: (response) => {
                console.log("Appointment booked successfully:", response);
                this.successMessage = "Appointment booked successfully! Redirecting...";
                this.appointmentForm.reset();
                setTimeout(() => { this.router.navigate(['/patient/appointments']); }, 2500);
            },
            error: (err) => {
                console.error("Error booking appointment API call:", err);
                 if (err.error && typeof err.error === 'object') {
                    let backendErrors = '';
                    for (const key in err.error) { if (err.error.hasOwnProperty(key)) { const messages = Array.isArray(err.error[key]) ? err.error[key].join(', ') : err.error[key]; backendErrors += `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${messages}\n`; } }
                    this.errorMessage = `Booking failed:\n${backendErrors.trim()}`;
                 } else if (err.error?.detail) { this.errorMessage = err.error.detail; }
                 else if(err.message) { this.errorMessage = `Booking failed: ${err.message}`; }
                 else { this.errorMessage = 'Failed to book appointment due to an unexpected error.'; }
            }
          }); // End subscribe apiService.bookAppointment

    }); // End subscribe authService.currentUser$
  }

    // Getters
    get doctor_id(): AbstractControl | null { return this.appointmentForm.get('doctor_id'); }
    get appointment_time(): AbstractControl | null { return this.appointmentForm.get('appointment_time'); }
    get reason(): AbstractControl | null { return this.appointmentForm.get('reason'); }
}