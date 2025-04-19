// src/app/features/patient/appointments/appointments.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Observable, BehaviorSubject, of, Subject, Subscription } from 'rxjs'; // Import Subscription
import { switchMap, map, catchError, startWith, finalize, takeUntil, tap } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

type ApiParams = { [param: string]: string | number | boolean };

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [ CommonModule, RouterLink, LoadingSpinnerComponent ],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class PatientAppointmentsComponent implements OnInit, OnDestroy {
  // Use direct property for data binding in template instead of async pipe on the main list
  appointments: any[] | null = null;
  isLoading = true; // Initialize as true
  errorMessage: string | null = null;
  filterStatus = new BehaviorSubject<string>('ALL');
  cancellingAppointmentId: number | null = null;
  cancelError: string | null = null;

  private destroy$ = new Subject<void>();
  private appointmentsSubscription: Subscription | null = null; // To manage main data subscription

  constructor(private apiService: ApiService, private cdRef: ChangeDetectorRef) { }

  ngOnInit(): void {
      console.log("PatientAppointments OnInit");
      // Subscribe to filter changes to trigger reloads
      this.filterStatus.pipe(
          takeUntil(this.destroy$) // Unsubscribe when component destroyed
      ).subscribe(status => {
          console.log("Filter changed or initial load, triggering loadAppointments for status:", status);
          this.loadAppointments(status); // Pass current status
      });
  }

  ngOnDestroy(): void {
      console.log("PatientAppointments OnDestroy");
      this.destroy$.next();
      this.destroy$.complete();
      // Unsubscribe manually if needed (though takeUntil should handle it)
      // this.appointmentsSubscription?.unsubscribe();
  }

  // Method now accepts the status directly
  loadAppointments(status: string = 'ALL'): void {
    console.log(`loadAppointments called with status: ${status}`);
    this.isLoading = true; // <<< START Loading
    this.errorMessage = null;
    this.cancelError = null;
    this.appointments = null; // Clear previous data
    this.cdRef.detectChanges(); // Show loading state

    // Cancel previous subscription if one is running
    this.appointmentsSubscription?.unsubscribe();

    let params: ApiParams = {};
    if (status && status !== 'ALL') { params['status'] = status; }

    this.appointmentsSubscription = this.apiService.getAppointments(params).pipe(
      map(data => data.sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime())),
      // finalize() runs on completion or error, good for setting loading false
      finalize(() => {
        console.log("API Call Finalized. Setting isLoading=false");
        this.isLoading = false;
        this.cdRef.detectChanges(); // <<< Ensure UI updates after loading is done
      }),
      takeUntil(this.destroy$) // Unsubscribe automatically on component destroy
    ).subscribe({
      next: (data) => {
        console.log("Appointments data received:", data);
        this.appointments = data; // Assign data to the component property
        this.errorMessage = null; // Clear error on success
        // isLoading is set in finalize
      },
      error: (err) => {
        console.error("Error loading patient appointments:", err);
        this.errorMessage = "Failed to load appointments. Please try again.";
        this.appointments = []; // Set empty array on error to clear previous data
        // isLoading is set in finalize
      }
    });
  }

  onFilterChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    // Push the new value to the BehaviorSubject, which triggers loadAppointments via the subscription in ngOnInit
    this.filterStatus.next(selectElement.value);
  }

  confirmCancelAppointment(appointmentId: number): void {
    const confirmation = confirm("Are you sure you want to cancel this appointment?");
    if (confirmation) {
      this.cancelAppointment(appointmentId);
    }
  }

  cancelAppointment(appointmentId: number): void {
    console.log("Attempting cancel for ID:", appointmentId);
    this.cancellingAppointmentId = appointmentId;
    this.cancelError = null;

    this.apiService.cancelAppointment(appointmentId).pipe(
        takeUntil(this.destroy$),
        finalize(() => { // Ensure button state resets
           this.cancellingAppointmentId = null;
           this.cdRef.detectChanges();
        })
    ).subscribe({
      next: () => {
        console.log(`Appointment ${appointmentId} cancelled successfully.`);
        this.filterStatus.next(this.filterStatus.value); // Re-trigger load with current filter
      },
      error: (err) => {
        console.error(`Error cancelling appointment ${appointmentId}:`, err);
        this.cancelError = err.error?.detail || 'Failed to cancel the appointment.';
      }
    });
  }

  formatDate(dateString: string | null): string {
     if (!dateString) return 'N/A';
     try { return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
     catch(e) { return 'Invalid Date'; }
  }
}