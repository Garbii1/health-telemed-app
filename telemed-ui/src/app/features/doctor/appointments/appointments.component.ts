// src/app/features/doctor/appointments/appointments.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <<< ADDED: For *ngIf, *ngFor, async, slice, ngClass
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // <<< ADDED: For notes form
import { ApiService } from '../../../core/services/api.service';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
// LoadingSpinnerComponent removed - unused warning

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [
      CommonModule,
      ReactiveFormsModule,
      // LoadingSpinnerComponent // Removed based on warning
  ],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class DoctorAppointmentsComponent implements OnInit {
  appointments$: Observable<any[] | null> | undefined; // Type allows null
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
      // ... (logic is correct from previous version, uses async pipe now) ...
      this.isLoading = true; this.errorMessage = null; const obs$ = this.filterStatus.pipe( switchMap(status => { /* ... build params ... */ return this.apiService.getAppointments(params).pipe( map(data => { /* ... sort data ... */ this.isLoading = false; return data; }), catchError(err => { /* ... handle error ... */ this.isLoading = false; return of([]); }) ); }) ); this.appointments$ = obs$;
  }

  onFilterChange(event: Event): void { /* ... */ }
  openNotesModal(appointment: any): void { /* ... */ }
  closeNotesModal(): void { /* ... */ }
  submitConsultationNotes(): void { /* ... */ }
  formatDate(dateString: string | null): string { /* ... */ }
}

type ApiParams = { [param: string]: string | number | boolean };