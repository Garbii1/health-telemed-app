// features/patient/appointments/appointments.component.ts
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { switchMap, map, startWith, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-patient-appointments',
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class PatientAppointmentsComponent implements OnInit {
  appointments$: Observable<any[]> | undefined;
  isLoading = false;
  errorMessage: string | null = null;
  filterStatus = new BehaviorSubject<string>('ALL'); // Default filter to show all
  cancellingAppointmentId: number | null = null;
  cancelError: string | null = null;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cancelError = null;

    this.appointments$ = this.filterStatus.pipe(
      startWith(this.filterStatus.value), // Trigger initial load
      switchMap(status => {
        this.isLoading = true;
        let params: any = {};
        if (status && status !== 'ALL') {
          params.status = status;
        }
        // Fetch appointments, sort descending by time
        return this.apiService.getAppointments(params).pipe(
          map(data => {
            this.isLoading = false;
            return data.sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime());
          }),
          catchError(err => {
            console.error("Error loading patient appointments:", err);
            this.errorMessage = "Failed to load appointments.";
            this.isLoading = false;
            return of([]); // Return empty array on error
          })
        );
      })
    );
  }

  onFilterChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.filterStatus.next(selectElement.value);
  }

  confirmCancelAppointment(appointmentId: number): void {
    // Simple browser confirmation
    const confirmation = confirm("Are you sure you want to cancel this appointment?");
    if (confirmation) {
      this.cancelAppointment(appointmentId);
    }
  }

  cancelAppointment(appointmentId: number): void {
    this.cancellingAppointmentId = appointmentId;
    this.cancelError = null;

    this.apiService.cancelAppointment(appointmentId).subscribe({
      next: () => {
        console.log(`Appointment ${appointmentId} cancelled successfully.`);
        this.cancellingAppointmentId = null;
        this.loadAppointments(); // Refresh the list
        // Alternatively, update the status of the specific item in the local list
      },
      error: (err) => {
        console.error(`Error cancelling appointment ${appointmentId}:`, err);
        this.cancelError = err.error?.detail || 'Failed to cancel the appointment. Please try again.';
        this.cancellingAppointmentId = null;
      }
    });
  }

  // Format date for display
  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
}