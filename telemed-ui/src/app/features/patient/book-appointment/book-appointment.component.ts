// src/app/features/patient/book-appointment/book-appointment.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core'; // Import ChangeDetectorRef, OnDestroy
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Observable, of, Subject } from 'rxjs'; // Import Subject
import { catchError, finalize, tap, takeUntil } from 'rxjs/operators'; // Import finalize, tap, takeUntil
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule, LoadingSpinnerComponent ],
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.scss']
})
export class BookAppointmentComponent implements OnInit, OnDestroy { // Implement OnDestroy
  appointmentForm: FormGroup; // Initialized in constructor
  doctors$: Observable<any[]> | undefined;
  isLoadingDoctors = true; // <<< Starts true
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  minDateTime: string = '';
  private destroy$ = new Subject<void>(); // For unsubscribing

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private cdRef: ChangeDetectorRef // <<< Inject ChangeDetectorRef
  ) {
    // Initialize form
    this.appointmentForm = this.fb.group({
      doctor_id: ['', Validators.required],
      appointment_time: ['', Validators.required],
      reason: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    this.loadDoctors(); // Load doctors on init
    this.setMinDateTime();
  }

  ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
  }

  setMinDateTime(): void { /* ... logic ... */ }

  loadDoctors(): void {
    console.log("loadDoctors called");
    this.isLoadingDoctors = true; // <<< Set loading true
    this.errorMessage = null; // Clear previous doctor loading errors
    this.cdRef.detectChanges(); // Trigger loading state view

    this.doctors$ = this.apiService.getDoctors().pipe(
      tap(doctors => console.log("Doctors received:", doctors)),
      catchError(err => {
        console.error("Error loading doctors:", err);
        this.errorMessage = "Could not load available doctors. Please try again later.";
        // isLoadingDoctors handled by finalize
        return of([]); // Return empty array on error
      }),
      finalize(() => { // <<< Use finalize to guarantee setting loading false
          console.log("loadDoctors finalize. Setting isLoadingDoctors = false");
          this.isLoadingDoctors = false;
          this.cdRef.detectChanges(); // <<< Trigger Change Detection
      }),
      takeUntil(this.destroy$) // <<< Unsubscribe on destroy
    );
    // No manual subscribe needed, async pipe handles it in the template
  }

  onSubmit(): void { /* ... logic ... */ }

  // Getters
  get doctor_id() { return this.appointmentForm.get('doctor_id'); }
  get appointment_time() { return this.appointmentForm.get('appointment_time'); }
  get reason() { return this.appointmentForm.get('reason'); }
}