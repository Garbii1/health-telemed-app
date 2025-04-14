// src/app/features/patient/book-appointment/book-appointment.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, async pipe
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // For forms
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
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
export class BookAppointmentComponent implements OnInit {
  // ... (Component logic remains the same) ...
  appointmentForm: FormGroup;
  doctors$: Observable<any[]> | undefined;
  isLoadingDoctors = true;
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  minDateTime: string = '';
  constructor( private fb: FormBuilder, private apiService: ApiService, private router: Router ) { /* ... form init ... */ }
  ngOnInit(): void { this.loadDoctors(); }
  setMinDateTime(): void { /* ... */ }
  loadDoctors(): void { /* ... */ }
  onSubmit(): void { /* ... */ }
  get doctor_id() { /* ... */ } // etc.
}