// src/app/features/patient/appointments/appointments.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, async pipe, ngClass
import { RouterLink } from '@angular/router'; // For routerLink
import { ApiService } from '../../../core/services/api.service';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { switchMap, map, startWith, catchError } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // Import spinner

@Component({
  selector: 'app-patient-appointments',
  standalone: true, // Add standalone
  imports: [
      CommonModule, // For *ngIf, *ngFor, async pipe, ngClass
      RouterLink, // For routerLink
      LoadingSpinnerComponent // Import child component
  ],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class PatientAppointmentsComponent implements OnInit {
  // Allow null type
  appointments$: Observable<any[] | null> | undefined;
  isLoading = true; // Start loading true
  errorMessage: string | null = null;
  filterStatus = new BehaviorSubject<string>('ALL');
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

    const obs$ = this.filterStatus.pipe(
      startWith(this.filterStatus.value), // Trigger initial load correctly
      switchMap(status => {
        this.isLoading = true; // Set loading when filter changes too
        let params: ApiParams = {};
        if (status && status !== 'ALL') {
          params['status'] = status;
        }
        return this.apiService.getAppointments(params).pipe(
          map(data => {
            this.isLoading = false; // Set loading false when data received
            return data.sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime());
          }),
          // Catch errors within the inner pipe if needed, or rely on outer catch
          catchError(err => {
            console.error("Error loading patient appointments inner pipe:", err);
            this.errorMessage = "Failed to load appointments.";
            this.isLoading = false;
            return of([]); // Return empty array on specific error
          })
        );
      }),
      // Removed outer catchError, letting inner one handle or relying on async pipe
    );

    this.appointments$ = obs$;
    // No manual subscribe needed if using async pipe primarily
  }

  onFilterChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.filterStatus.next(selectElement.value);
  }

  confirmCancelAppointment(appointmentId: number): void {
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
        this.loadAppointments(); // Refresh list
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
    return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
}

// Define ApiParams type if not globally available
type ApiParams = { [param: string]: string | number | boolean };