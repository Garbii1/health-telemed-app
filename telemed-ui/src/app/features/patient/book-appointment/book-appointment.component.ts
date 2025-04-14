// features/patient/book-appointment/book-appointment.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-book-appointment',
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.scss']
})
export class BookAppointmentComponent implements OnInit {
  appointmentForm: FormGroup;
  doctors$: Observable<any[]> | undefined;
  isLoadingDoctors = true;
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  minDateTime: string = ''; // For datetime-local input minimum value

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router
  ) {
    this.appointmentForm = this.fb.group({
      doctor_id: ['', Validators.required],
      // Ensure time is included in validation if needed, using datetime-local type
      appointment_time: ['', Validators.required],
      reason: ['', Validators.maxLength(500)] // Optional reason with max length
    });
    this.setMinDateTime();
  }

  ngOnInit(): void {
    this.loadDoctors();
  }

  // Set minimum date/time to prevent booking in the past
  setMinDateTime(): void {
     const now = new Date();
     // Optional: Add a buffer, e.g., cannot book less than 1 hour from now
     // now.setHours(now.getHours() + 1);

     // Format for datetime-local input (YYYY-MM-DDTHH:mm)
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
        return of([]); // Return empty array on error
      }),
      finalize(() => this.isLoadingDoctors = false)
    );
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    // Optional: Validate if selected time is in the future server-side as well,
    // but basic client-side check can improve UX.
    const selectedTime = new Date(this.appointmentForm.value.appointment_time);
    if (selectedTime <= new Date()) {
         this.appointmentForm.get('appointment_time')?.setErrors({ pastDate: true });
         this.errorMessage = "Cannot book an appointment in the past.";
         return;
     }


    this.isSubmitting = true;

    // Prepare data in the format expected by the backend API
    const appointmentData = {
        doctor_id: this.appointmentForm.value.doctor_id,
        // Ensure the datetime string is in a format Django DateTimeField accepts (ISO 8601 is safest)
        // The datetime-local input usually provides YYYY-MM-DDTHH:mm, which is generally okay.
        appointment_time: this.appointmentForm.value.appointment_time,
        reason: this.appointmentForm.value.reason || '' // Send empty string if null/undefined
    };

    this.apiService.bookAppointment(appointmentData)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (response) => {
          console.log("Appointment booked:", response);
          this.successMessage = "Appointment booked successfully!";
          this.appointmentForm.reset();
          // Redirect to appointments list after a short delay
          setTimeout(() => {
             this.router.navigate(['/patient/appointments']);
          }, 2000);
        },
        error: (err) => {
          console.error("Error booking appointment:", err);
          // Display specific backend errors if available
          this.errorMessage = err.error?.detail || err.error?.appointment_time || err.error[0] || "Failed to book appointment. Please check the details or try a different time.";
        }
      });
  }

   // --- Getters for template validation ---
   get doctor_id() { return this.appointmentForm.get('doctor_id'); }
   get appointment_time() { return this.appointmentForm.get('appointment_time'); }
   get reason() { return this.appointmentForm.get('reason'); }
}