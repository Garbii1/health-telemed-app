// src/app/features/doctor/appointments/appointments.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

// Define ApiParams type if not globally available
type ApiParams = { [param: string]: string | number | boolean };

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule ],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class DoctorAppointmentsComponent implements OnInit {
  appointments$: Observable<any[] | null> | undefined;
  isLoading = true;
  errorMessage: string | null = null;
  selectedAppointment: any = null;
  notesForm: FormGroup;
  isSubmittingNotes = false;
  filterStatus = new BehaviorSubject<string>('SCHEDULED');
  showNotesModalForAppointmentId: number | null = null;

  constructor(private apiService: ApiService, private fb: FormBuilder) {
    this.notesForm = this.fb.group({ consultation_notes: ['', Validators.required] });
  }

  ngOnInit(): void { this.loadAppointments(); }

  loadAppointments(): void {
    this.isLoading = true;
    this.errorMessage = null;
    const obs$ = this.filterStatus.pipe(
      switchMap(status => {
          this.isLoading = true;
          let localParams: ApiParams = {}; // Fix: Declare variable 'localParams'
          if (status && status !== 'ALL') {
             localParams['status'] = status;
          }
          // Pass the declared variable to the service call
          return this.apiService.getAppointments(localParams).pipe(
              map(data => {
                  this.isLoading = false;
                  return data.sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime());
              }),
              catchError(err => {
                  console.error("Error loading doctor appointments inner pipe:", err);
                  this.errorMessage = "Failed to load appointments.";
                  this.isLoading = false;
                  return of([]);
              })
          );
        })
    );
    this.appointments$ = obs$;
  }

  onFilterChange(event: Event): void { /* ... */ }
  openNotesModal(appointment: any): void { /* ... */ }
  closeNotesModal(): void { /* ... */ }
  submitConsultationNotes(): void { /* ... */ }

  // Fix: Ensure return value
  formatDate(dateString: string | null): string {
     if (!dateString) return 'N/A';
     try { return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
     catch(e) { return 'Invalid Date'; }
  }
}