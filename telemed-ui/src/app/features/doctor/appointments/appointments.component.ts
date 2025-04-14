// src/app/features/doctor/appointments/appointments.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, async pipe, slice pipe, ngClass
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // For notes form
import { ApiService } from '../../../core/services/api.service';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
// Note: LoadingSpinnerComponent removed as it was unused in the template (NG8113)

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [
      CommonModule,
      ReactiveFormsModule,
      // LoadingSpinnerComponent // Removed - unused
  ],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class DoctorAppointmentsComponent implements OnInit {
  appointments$: Observable<any[] | null> | undefined; // Allow null type
  isLoading = true;
  errorMessage: string | null = null;
  selectedAppointment: any = null;
  notesForm: FormGroup;
  isSubmittingNotes = false;
  filterStatus = new BehaviorSubject<string>('SCHEDULED');
  showNotesModalForAppointmentId: number | null = null;

  constructor(private apiService: ApiService, private fb: FormBuilder) {
    this.notesForm = this.fb.group({
      consultation_notes: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading = true;
    this.errorMessage = null;
    const obs$ = this.filterStatus.pipe(
      switchMap(status => {
          this.isLoading = true;
          let params: ApiParams = {};
          if (status && status !== 'ALL') {
             params['status'] = status;
          }
          return this.apiService.getAppointments(params).pipe(
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
    // No manual subscribe needed if template uses async pipe and handles loading/error states
  }

  onFilterChange(event: Event): void {
      const selectElement = event.target as HTMLSelectElement;
      this.filterStatus.next(selectElement.value);
  }

  openNotesModal(appointment: any): void {
    this.selectedAppointment = appointment;
    this.notesForm.patchValue({
      consultation_notes: appointment.consultation_notes || ''
    });
    this.showNotesModalForAppointmentId = appointment.id;
  }

  closeNotesModal(): void {
    this.selectedAppointment = null;
    this.notesForm.reset();
    this.showNotesModalForAppointmentId = null;
    this.isSubmittingNotes = false;
    this.notesForm.setErrors(null);
  }

  submitConsultationNotes(): void {
    if (this.notesForm.invalid || !this.selectedAppointment) {
        this.notesForm.markAllAsTouched();
        return;
    }
    this.isSubmittingNotes = true;
    const notes = this.notesForm.value.consultation_notes;
    this.notesForm.setErrors(null);

    this.apiService.completeAppointment(this.selectedAppointment.id, notes)
      .subscribe({
        next: () => {
          console.log('Appointment completed successfully');
          this.closeNotesModal();
          this.loadAppointments(); // Refresh list
        },
        error: (err) => {
          console.error('Error completing appointment:', err);
          this.notesForm.setErrors({ submitError: err.error?.detail || 'Failed to save notes.' });
          this.isSubmittingNotes = false;
        }
      });
  }

   formatDate(dateString: string | null): string {
     if (!dateString) return 'N/A';
     return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
   }
}

type ApiParams = { [param: string]: string | number | boolean };