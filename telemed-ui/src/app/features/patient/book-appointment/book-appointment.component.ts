// src/app/features/patient/book-appointment/book-appointment.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Observable, of, Subject, Subscription } from 'rxjs'; // Import Subscription
import { catchError, finalize, tap, takeUntil } from 'rxjs/operators';
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
  doctors: any[] = []; // <<< Store doctors directly instead of using async pipe for easier debugging
  isLoadingDoctors = true;
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  minDateTime: string = '';
  private destroy$ = new Subject<void>();
  private doctorsSubscription: Subscription | null = null; // <<< Subscription management

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) {
    this.appointmentForm = this.fb.group({
      doctor_id: ['', Validators.required],
      appointment_time: ['', Validators.required],
      reason: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    console.log("BookAppointment OnInit"); // Log init
    this.loadDoctors();
    this.setMinDateTime();
  }

  ngOnDestroy(): void {
      console.log("BookAppointment OnDestroy"); // Log destroy
      this.destroy$.next();
      this.destroy$.complete();
      this.doctorsSubscription?.unsubscribe(); // <<< Explicit unsubscribe
  }

  setMinDateTime(): void { /* ... */ }

  loadDoctors(): void {
    console.log("loadDoctors called");
    this.isLoadingDoctors = true;
    this.errorMessage = null;
    this.doctors = []; // Clear previous doctors
    this.cdRef.detectChanges(); // Trigger loading state update

    // Cancel previous subscription if any
    this.doctorsSubscription?.unsubscribe();

    console.log("Subscribing to apiService.getDoctors()");
    this.doctorsSubscription = this.apiService.getDoctors().pipe(
      tap(
        (doctors) => console.log("SUCCESS: Doctors data received in pipe:", doctors), // Log success
        (error) => console.error("ERROR: Error received in pipe:", error), // Log error within pipe (less common place)
        () => console.log("COMPLETE: getDoctors observable completed") // Log completion
      ),
      catchError(err => { // Catch potential errors from the HTTP request itself
        console.error("CATCHERROR: Error loading doctors:", err);
        this.errorMessage = "Could not load available doctors. Please try again later.";
        // isLoadingDoctors will be set by finalize
        return of([]); // Important: Return an observable of an empty array
      }),
      finalize(() => { // Runs on completion OR error
          console.log("FINALIZE: Setting isLoadingDoctors = false");
          this.isLoadingDoctors = false;
          this.cdRef.detectChanges(); // Ensure UI update after loading finishes
      }),
      takeUntil(this.destroy$) // Automatically unsubscribe on component destroy
    ).subscribe( // Subscribe to trigger the observable chain
        data => {
            console.log("SUBSCRIBE/NEXT: Assigning doctors data");
            this.doctors = data; // Assign the received data
             // Optionally trigger CD again if needed, though finalize should cover it
            // this.cdRef.detectChanges();
        }
        // Error handling is done in catchError, finalize handles cleanup
        // error: (err) => { /* Already handled by catchError */ }
    );
  }

  onSubmit(): void { /* ... logic ... */ }
  get doctor_id() { return this.appointmentForm.get('doctor_id'); }
  get appointment_time() { return this.appointmentForm.get('appointment_time'); }
  get reason() { return this.appointmentForm.get('reason'); }
}