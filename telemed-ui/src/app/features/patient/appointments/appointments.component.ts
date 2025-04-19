// src/app/features/patient/appointments/appointments.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, async pipe, ngClass
import { RouterLink } from '@angular/router'; // For routerLink
import { ApiService } from '../../../core/services/api.service';
import { Observable, BehaviorSubject, of, Subject, Subscription } from 'rxjs'; // Import Subject, Subscription
import { switchMap, map, catchError, startWith, finalize, takeUntil, tap, skip } from 'rxjs/operators'; // Import skip
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

// Type alias for params object for better readability
type ApiParams = { [param: string]: string | number | boolean };

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [
      CommonModule,
      RouterLink,
      LoadingSpinnerComponent
  ],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class PatientAppointmentsComponent implements OnInit, OnDestroy {
  // Use a direct property for data binding in template instead of async pipe for the main list
  appointments: any[] | null = null;
  isLoading = true; // Initialize as true, loading starts immediately
  errorMessage: string | null = null;
  // BehaviorSubject to hold the current filter status
  filterStatus = new BehaviorSubject<string>('ALL'); // Default filter
  cancellingAppointmentId: number | null = null;
  cancelError: string | null = null;

  private destroy$ = new Subject<void>(); // Subject to trigger unsubscription
  private appointmentsSubscription: Subscription | null = null; // To manage the main data subscription

  constructor(
    private apiService: ApiService,
    private cdRef: ChangeDetectorRef // Inject ChangeDetectorRef for manual change detection triggers
  ) { }

  ngOnInit(): void {
      console.log("PatientAppointments OnInit - Initializing component and loading data.");
      // Load initial data based on the current filter value
      this.loadAppointments(this.filterStatus.value);

      // Subscribe to subsequent changes in the filter status
      this.filterStatus.pipe(
          skip(1), // <<< Important: Skip the initial value emitted by BehaviorSubject on subscription
          takeUntil(this.destroy$) // Automatically unsubscribe when the component is destroyed
      ).subscribe(status => {
          console.log("Filter status changed to:", status);
          this.loadAppointments(status); // Reload data when filter changes
      });
  }

  ngOnDestroy(): void {
      console.log("PatientAppointments OnDestroy - Cleaning up subscriptions.");
      this.destroy$.next(); // Trigger unsubscription for takeUntil
      this.destroy$.complete();
      this.appointmentsSubscription?.unsubscribe(); // Explicitly unsubscribe just in case
  }

  // Force reload method (e.g., for a retry button)
  forceReload(): void {
      console.log("forceReload called");
      this.loadAppointments(this.filterStatus.value);
  }

  // Main method to load appointments based on status filter
  loadAppointments(status: string): void {
    console.log(`loadAppointments called with status: ${status}`);
    this.isLoading = true; // <<< Set loading state to true
    this.errorMessage = null; // Clear previous errors
    this.cancelError = null;
    this.appointments = null; // Clear previous appointment data immediately
    this.cdRef.detectChanges(); // <<< Trigger change detection to show loading spinner

    // Cancel any previous ongoing appointment fetch request
    this.appointmentsSubscription?.unsubscribe();

    let params: ApiParams = {};
    if (status && status !== 'ALL') {
      params['status'] = status; // Add status parameter if not 'ALL'
    }

    console.log("Requesting appointments with params:", params);
    this.appointmentsSubscription = this.apiService.getAppointments(params).pipe(
      // Sort data by appointment time, newest first
      map(data => data.sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime())),
      tap(data => console.log("Appointments data received and sorted:", data)), // Log successful data fetch
      catchError(err => { // Handle errors during the API call
        console.error("Error loading patient appointments:", err);
        this.errorMessage = "Failed to load appointments. Please try again.";
        // isLoading will be set to false in finalize
        return of([]); // Return an empty array observable on error
      }),
      finalize(() => { // <<< This block executes on completion or error
        console.log("Appointment loading finalized. Setting isLoading to false.");
        this.isLoading = false; // <<< Set loading state to false
        this.cdRef.detectChanges(); // <<< Trigger change detection again to update UI
      }),
      takeUntil(this.destroy$) // Ensure unsubscription on component destroy
    ).subscribe({
      next: (data) => {
        console.log("Assigning fetched data to component property.");
        this.appointments = data; // Assign the fetched/sorted data
        this.errorMessage = null; // Clear error message on success
      },
      error: (err) => {
        // Error is handled by catchError, finalize sets loading state
        console.error("Subscription received error (should have been caught by catchError):", err);
        // Optionally set error message again here if needed, but catchError should handle it
        this.appointments = []; // Ensure data is empty on error
      }
    });
  }

  // Handles the change event from the status filter dropdown
  onFilterChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const newStatus = selectElement.value;
    console.log("Filter dropdown changed to:", newStatus);
    // Push the new status to the BehaviorSubject, which triggers the subscription in ngOnInit
    this.filterStatus.next(newStatus);
  }

  // Asks for confirmation before cancelling
  confirmCancelAppointment(appointmentId: number): void {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      this.cancelAppointment(appointmentId);
    }
  }

  // Sends the cancellation request to the API
  cancelAppointment(appointmentId: number): void {
    console.log("Attempting to cancel appointment ID:", appointmentId);
    this.cancellingAppointmentId = appointmentId; // Set state for specific button loading
    this.cancelError = null; // Clear previous cancel errors

    this.apiService.cancelAppointment(appointmentId).pipe(
        takeUntil(this.destroy$), // Unsubscribe if component is destroyed
        finalize(() => { // Ensure button state resets regardless of success/error
           console.log("Cancel request finalized for ID:", appointmentId);
           this.cancellingAppointmentId = null;
           this.cdRef.detectChanges();
        })
    ).subscribe({
      next: () => {
        console.log(`Appointment ${appointmentId} cancelled successfully.`);
        // Refresh the list by re-emitting the current filter value
        this.filterStatus.next(this.filterStatus.value);
      },
      error: (err) => {
        console.error(`Error cancelling appointment ${appointmentId}:`, err);
        // Extract error detail from backend if possible
        this.cancelError = err.error?.detail || 'Failed to cancel the appointment. Please try again.';
      }
    });
  }

  // Formats date string for display
  formatDate(dateString: string | null): string {
     if (!dateString) return 'N/A';
     try { return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
     catch(e) { return 'Invalid Date'; }
  }
}