// src/app/features/patient/appointments/appointments.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <<< ADDED: For *ngIf, *ngFor, async pipe, ngClass
import { RouterLink } from '@angular/router'; // <<< ADDED: For routerLink
import { ApiService } from '../../../core/services/api.service';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { switchMap, map, catchError, startWith } from 'rxjs/operators'; // <<< ADDED: startWith
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // <<< ADDED

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [
      CommonModule,
      RouterLink,
      LoadingSpinnerComponent // <<< ADDED
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

  ngOnInit(): void { this.loadAppointments(); }

  loadAppointments(): void {
      // ... (logic from previous correct version) ...
       this.isLoading = true; this.errorMessage = null; this.cancelError = null; const obs$ = this.filterStatus.pipe( startWith(this.filterStatus.value), switchMap(status => { this.isLoading = true; let params: ApiParams = {}; if (status && status !== 'ALL') { params['status'] = status; } return this.apiService.getAppointments(params).pipe( map(data => { this.isLoading = false; return data.sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime()); }), catchError(err => { /* ... */ this.isLoading = false; return of([]); }) ); }) ); this.appointments$ = obs$;
  }

  onFilterChange(event: Event): void { /* ... */ }
  confirmCancelAppointment(appointmentId: number): void { /* ... */ }
  cancelAppointment(appointmentId: number): void { /* ... */ }
  formatDate(dateString: string | null): string { /* ... */ }
}

type ApiParams = { [param: string]: string | number | boolean };