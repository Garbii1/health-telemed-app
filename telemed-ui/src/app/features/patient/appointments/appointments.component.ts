// src/app/features/patient/appointments/appointments.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core'; // Import ChangeDetectorRef, OnDestroy
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Observable, BehaviorSubject, of, Subject } from 'rxjs'; // Import Subject
import { switchMap, map, catchError, startWith, finalize, takeUntil, tap } from 'rxjs/operators'; // Import finalize, takeUntil, tap
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

type ApiParams = { [param: string]: string | number | boolean };

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [ CommonModule, RouterLink, LoadingSpinnerComponent ],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class PatientAppointmentsComponent implements OnInit, OnDestroy { // Implement OnDestroy
  appointments$: Observable<any[] | null> | undefined;
  isLoading = true; // <<< Start true
  errorMessage: string | null = null;
  filterStatus = new BehaviorSubject<string>('ALL');
  cancellingAppointmentId: number | null = null;
  cancelError: string | null = null;
  private destroy$ = new Subject<void>(); // For unsubscribing

  constructor(private apiService: ApiService, private cdRef: ChangeDetectorRef) { } // Inject cdRef

  ngOnInit(): void {
      console.log("PatientAppointments OnInit");
      this.loadAppointments();
  }

  ngOnDestroy(): void {
      console.log("PatientAppointments OnDestroy");
      this.destroy$.next();
      this.destroy$.complete();
  }

  loadAppointments(): void {
    console.log("loadAppointments called, filter:", this.filterStatus.value); // Debug
    this.isLoading = true; // <<< Set loading true at the start
    this.errorMessage = null;
    this.cancelError = null;
    this.cdRef.detectChanges(); // Trigger initial loading state update

    this.appointments$ = this.filterStatus.pipe(
      // startWith(this.filterStatus.value), // startWith might cause double loading if BehaviorSubject emits immediately
      switchMap(status => {
        console.log(`switchMap - Fetching appointments for status: ${status}`); // Debug
        // isLoading should already be true here
        let params: ApiParams = {};
        if (status && status !== 'ALL') { params['status'] = status; }
        return this.apiService.getAppointments(params).pipe(
           tap(data => console.log("Appointments API success, data length:", data?.length)), // Debug success
           map(data => data.sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime())),
           catchError(err => {
               console.error("Error loading patient appointments inner pipe:", err);
               this.errorMessage = "Failed to load appointments.";
               // isLoading will be set by finalize
               return of([]); // Return empty array on error
           })
        );
      }),
      // Use finalize to guarantee isLoading is set false
      finalize(() => {
           console.log("loadAppointments finalize. Setting isLoading = false"); // Debug
           this.isLoading = false;
           this.cdRef.detectChanges(); // <<< Trigger Change Detection AFTER loading done
      }),
      takeUntil(this.destroy$) // Ensure unsubscription
    );
    // Let async pipe handle the actual data subscription in the template
  }

  // Ensure these methods exist
  onFilterChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    console.log("Filter changed to:", selectElement.value); // Debug
    this.filterStatus.next(selectElement.value);
    // loadAppointments is triggered automatically by the filterStatus BehaviorSubject change
  }

  confirmCancelAppointment(appointmentId: number): void {
    const confirmation = confirm("Are you sure you want to cancel this appointment?");
    if (confirmation) {
      this.cancelAppointment(appointmentId);
    }
  }

  cancelAppointment(appointmentId: number): void {
    console.log("Attempting to cancel appointment:", appointmentId); // Debug
    this.cancellingAppointmentId = appointmentId;
    this.cancelError = null;

    this.apiService.cancelAppointment(appointmentId).pipe(
        takeUntil(this.destroy$) // Unsubscribe if component destroyed during request
    ).subscribe({
      next: () => {
        console.log(`Appointment ${appointmentId} cancelled successfully.`);
        this.cancellingAppointmentId = null;
        // Trigger a refresh by pushing the current filter value again (or fetching directly)
        this.filterStatus.next(this.filterStatus.value); // Re-trigger loadAppointments
        // Alternatively: this.loadAppointments(); // If not using BehaviorSubject trigger
      },
      error: (err) => {
        console.error(`Error cancelling appointment ${appointmentId}:`, err);
        this.cancelError = err.error?.detail || 'Failed to cancel the appointment. Please try again.';
        this.cancellingAppointmentId = null;
      }
    });
  }

  formatDate(dateString: string | null): string {
     if (!dateString) return 'N/A';
     try { return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
     catch(e) { return 'Invalid Date'; }
  }
}