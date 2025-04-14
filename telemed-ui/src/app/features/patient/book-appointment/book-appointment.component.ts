// src/app/features/patient/book-appointment/book-appointment.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, async pipe
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // For forms
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // Import spinner

@Component({
  selector: 'app-book-appointment',
  standalone: true, // Add standalone
  imports: [
      CommonModule, // For *ngIf, *ngFor, async pipe
      ReactiveFormsModule, // For [formGroup] etc.
      LoadingSpinnerComponent // Import child component
  ],
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.scss']
})
export class BookAppointmentComponent implements OnInit {
  appointmentForm: FormGroup;
  doctors$: Observable<any[]> | undefined;
  isLoadingDoctors = true; // Start loading true
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  minDateTime: string = '';

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router
  ) {
    this.appointmentForm = this.fb.group({
      doctor_id: ['', Validators.required],
      appointment_time: ['', Validators.required],
      reason: ['', Validators.maxLength(500)]
    });
    this.setMinDateTime();
  }

  ngOnInit(): void {
    this.loadDoctors();
  }

  setMinDateTime(): void {
     const now = new Date();
     // Optional: Add a buffer (e.g., 1 hour)
     // now.setHours(now.getHours() + 1);
     const year = now.getFullYear();
     const month = (now.getMonth() + 1).toString().padStart(2, '0');
     const day = now.getDate().toString().padStart(2, '0');
     const hours = now.getHours().toString().padStart(2, '0');
     const minutes = now.getMinutes().toString().padStart(2, '0');
     this.minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  loadDoctors(): void {
    this.isLoadingDoctors = true;
    this.doctors$ = this.apiService.getDoctors().pipe(
      catchError(err => {
        console.error("Error loading doctors:", err);
        this.errorMessage = "Could not load available doctors. Please try again later.";
        return of([]);
      }),
      finalize(() => this.isLoadingDoctors = false) // Set loading false on completion/error
    );
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    const selectedTime = new Date(this.appointmentForm.value.appointment_time);
    if (selectedTime <= new Date()) {
         this.appointmentForm.get('appointment_time')?.setErrors({ pastDate: true });
         this.errorMessage = "Cannot book an appointment in the past.";
         return;
     }

    this.isSubmitting = true;

    const appointmentData = {
        doctor_id: this.appointmentForm.value.doctor_id,
        appointment_time: this.appointmentForm.value.appointment_time,
        reason: this.appointmentForm.value.reason || ''
    };

    this.apiService.bookAppointment(appointmentData)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (response) => {
          this.successMessage = "Appointment booked successfully!";
          this.appointmentForm.reset();
          setTimeout(() => {
             this.router.navigate(['/patient/appointments']);
          }, 2000);
        },
        error: (err) => {
          console.error("Error booking appointment:", err);
          this.errorMessage = err.error?.detail || err.error?.appointment_time || err.error[0] || "Failed to book appointment. Please check the details or try a different time.";
        }
      });
  }

   get doctor_id() { return this.appointmentForm.get('doctor_id'); }
   get appointment_time() { return this.appointmentForm.get('appointment_time'); }
   get reason() { return this.appointmentForm.get('reason'); }
}