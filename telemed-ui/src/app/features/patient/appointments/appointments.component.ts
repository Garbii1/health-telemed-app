// src/app/features/patient/appointments/appointments.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { switchMap, map, catchError, startWith } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [ CommonModule, RouterLink, LoadingSpinnerComponent ],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class PatientAppointmentsComponent implements OnInit {
  appointments$: Observable<any[] | null> | undefined;
  isLoading = true;
  errorMessage: string | null = null;
  filterStatus = new BehaviorSubject<string>('ALL');
  cancellingAppointmentId: number | null = null;
  cancelError: string | null = null;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void { this.loadAppointments(); }
  loadAppointments(): void { /* ... */ }
  onFilterChange(event: Event): void { /* ... */ }
  confirmCancelAppointment(appointmentId: number): void { /* ... */ }
  cancelAppointment(appointmentId: number): void { /* ... */ }

  // Fix: Ensure return value
  formatDate(dateString: string | null): string {
     if (!dateString) {
        return 'N/A'; // Return string for null input
     }
     try {
        return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); // Return formatted string
     } catch(e) {
        return 'Invalid Date'; // Return string on error
     }
  }
}

type ApiParams = { [param: string]: string | number | boolean };