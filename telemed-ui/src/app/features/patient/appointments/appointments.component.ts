// src/app/features/patient/appointments/appointments.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, async pipe, ngClass
import { RouterLink } from '@angular/router'; // For routerLink
import { ApiService } from '../../../core/services/api.service';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

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
export class PatientAppointmentsComponent implements OnInit {
  appointments$: Observable<any[] | null> | undefined; // Allow null
  isLoading = true;
  errorMessage: string | null = null;
  filterStatus = new BehaviorSubject<string>('ALL');
  cancellingAppointmentId: number | null = null;
  cancelError: string | null = null;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    // ... (loadAppointments logic remains the same) ...
     this.isLoading = true; this.errorMessage = null; this.cancelError = null; const obs$ = this.filterStatus.pipe( startWith(this.filterStatus.value), switchMap(status => { this.isLoading = true; let params: ApiParams = {}; if (status && status !== 'ALL') { params['status'] = status; } return this.apiService.getAppointments(params).pipe( map(data => { this.isLoading = false; return data.sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime()); }), catchError(err => { console.error("Error loading patient appointments inner pipe:", err); this.errorMessage = "Failed to load appointments."; this.isLoading = false; return of([]); }) ); }) ); this.appointments$ = obs$;
  }

  onFilterChange(event: Event): void {
    // ... (onFilterChange logic remains the same) ...
     const selectElement = event.target as HTMLSelectElement; this.filterStatus.next(selectElement.value);
  }

  confirmCancelAppointment(appointmentId: number): void {
    // ... (confirmCancelAppointment logic remains the same) ...
     const confirmation = confirm("Are you sure you want to cancel this appointment?"); if (confirmation) { this.cancelAppointment(appointmentId); }
  }

  cancelAppointment(appointmentId: number): void {
    // ... (cancelAppointment logic remains the same) ...
     this.cancellingAppointmentId = appointmentId; this.cancelError = null; this.apiService.cancelAppointment(appointmentId).subscribe({ next: () => { console.log(`Appointment ${appointmentId} cancelled successfully.`); this.cancellingAppointmentId = null; this.loadAppointments(); }, error: (err) => { console.error(`Error cancelling appointment ${appointmentId}:`, err); this.cancelError = err.error?.detail || 'Failed to cancel the appointment. Please try again.'; this.cancellingAppointmentId = null; } });
  }

  formatDate(dateString: string | null): string {
    // ... (formatDate logic remains the same) ...
     if (!dateString) return 'N/A'; return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
}

type ApiParams = { [param: string]: string | number | boolean };