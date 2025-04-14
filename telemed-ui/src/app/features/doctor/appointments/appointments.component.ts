// features/doctor/appointments/appointments.component.ts
import { Component, OnInit, OnDestroy, TemplateRef } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable, Subscription, BehaviorSubject, combineLatest } from 'rxjs';
import { switchMap, map, startWith } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// Consider using a modal library like ng-bootstrap or ngx-bootstrap for the notes form
// For simplicity, we'll use basic conditional display here.

@Component({
  selector: 'app-doctor-appointments',
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class DoctorAppointmentsComponent implements OnInit {
  appointments$: Observable<any[]> | undefined;
  isLoading = false;
  errorMessage: string | null = null;
  selectedAppointment: any = null; // For editing notes/completing
  notesForm: FormGroup;
  isSubmittingNotes = false;
  filterStatus = new BehaviorSubject<string>('SCHEDULED'); // Default filter

  // For simpler state management without modal library:
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

    // Combine filter changes with API call
    this.appointments$ = this.filterStatus.pipe(
      switchMap(status => {
          this.isLoading = true; // Set loading true when filter changes
          let params: any = {};
          if (status && status !== 'ALL') {
             params.status = status; // Add status filter if not 'ALL'
          }
          // Fetch appointments and handle loading state
          return this.apiService.getAppointments(params).pipe(
              map(data => {
                  this.isLoading = false;
                  // Sort by appointment time descending
                  return data.sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime());
              }),
              startWith(null) // Emit null initially while loading
          );
        })
    );

    // Handle potential errors globally for the stream (or use try/catch in subscribe if preferred)
    this.appointments$.subscribe({
        error: err => {
             console.error("Error loading doctor appointments:", err);
             this.errorMessage = "Failed to load appointments.";
             this.isLoading = false; // Ensure loading is false on error
        }
    });
  }

  onFilterChange(event: Event): void {
      const selectElement = event.target as HTMLSelectElement;
      this.filterStatus.next(selectElement.value);
    }


  openNotesModal(appointment: any): void {
    this.selectedAppointment = appointment;
    // Pre-fill notes if they already exist (e.g., editing previous notes)
    this.notesForm.patchValue({
      consultation_notes: appointment.consultation_notes || ''
    });
    this.showNotesModalForAppointmentId = appointment.id; // Show modal
  }

  closeNotesModal(): void {
    this.selectedAppointment = null;
    this.notesForm.reset();
    this.showNotesModalForAppointmentId = null; // Hide modal
    this.isSubmittingNotes = false;
  }

  submitConsultationNotes(): void {
    if (this.notesForm.invalid || !this.selectedAppointment) {
      return;
    }

    this.isSubmittingNotes = true;
    const notes = this.notesForm.value.consultation_notes;

    this.apiService.completeAppointment(this.selectedAppointment.id, notes)
      .subscribe({
        next: () => {
          console.log('Appointment completed successfully');
          this.closeNotesModal();
          this.loadAppointments(); // Refresh the list
          // Could also update the specific item in the list locally for better UX
        },
        error: (err) => {
          console.error('Error completing appointment:', err);
          // Display error within the modal or globally
          this.notesForm.setErrors({ submitError: err.error?.detail || 'Failed to save notes.' });
          this.isSubmittingNotes = false;
        }
      });
  }

   // Format date for display
   formatDate(dateString: string): string {
     if (!dateString) return 'N/A';
     return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
   }
}