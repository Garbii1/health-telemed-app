// src/app/features/patient/book-appointment/book-appointment.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <<< ADDED: For *ngIf, *ngFor, async pipe
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // <<< ADDED: For forms
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // <<< ADDED

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [
      CommonModule,
      ReactiveFormsModule, // <<< ADDED
      LoadingSpinnerComponent // <<< ADDED
  ],
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.scss']
})
export class BookAppointmentComponent implements OnInit {
  // Fix: Initialize FormGroup immediately
  appointmentForm: FormGroup = this.fb.group({
      doctor_id: ['', Validators.required],
      appointment_time: ['', Validators.required],
      reason: ['', Validators.maxLength(500)]
  });
  doctors$: Observable<any[]> | undefined;
  isLoadingDoctors = true;
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  minDateTime: string = '';

  constructor(
    private fb: FormBuilder, // Inject FormBuilder here
    private apiService: ApiService,
    private router: Router
  ) {
    // Form initialization moved to declaration for definite assignment
    this.setMinDateTime();
  }

  ngOnInit(): void { this.loadDoctors(); }
  setMinDateTime(): void { /* ... */ }
  loadDoctors(): void { /* ... */ }
  onSubmit(): void { /* ... */ }

   // Fix: Use correct getters for the template
   get doctor_id() { return this.appointmentForm.get('doctor_id'); }
   get appointment_time() { return this.appointmentForm.get('appointment_time'); }
   get reason() { return this.appointmentForm.get('reason'); }
}