// src/app/features/doctor/appointments/appointments.component.ts
import { Component, OnInit } from '@angular/core'; // Added OnInit
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, async pipe, slice pipe, ngClass
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // For notes form
import { ApiService } from '../../../core/services/api.service';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { switchMap, map, startWith, catchError } from 'rxjs/operators';
// Assuming LoadingSpinnerComponent is standalone and correctly exported
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';


@Component({
  selector: 'app-doctor-appointments',
  standalone: true, // Add standalone
  imports: [
      CommonModule, // Provides *ngIf, *ngFor, async pipe, slice pipe, ngClass
      ReactiveFormsModule, // Provides formGroup etc.
      LoadingSpinnerComponent // Import child component
  ],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class DoctorAppointmentsComponent implements OnInit { // Implement OnInit
  // Fix: Allow null type for observable due to startWith(null)
  appointments$: Observable<any[] | null> | undefined;
  isLoading = true; // Start loading true
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
    // Set loading true at the start of the load process
    this.isLoading = true;
    this.errorMessage = null;
    // Assign observable first
    const obs$ = this.filterStatus.pipe(
      // startWith(this.filterStatus.value), // No need for startWith if isLoading handles initial state
      switchMap(status => {
          this.isLoading = true; // Also set loading true when filter changes
          let params: ApiParams = {}; // Use type alias if defined in api.service
          if (status && status !== 'ALL') {
             params['status'] = status; // Use bracket notation for safety
          }
          return this.apiService.getAppointments(params).pipe(
              map(data => {
                  this.isLoading = false; // Set loading false only when data arrives
                  return data.sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime());
              }),
              // Let the main subscription handle errors
              // catchError(err => {
              //     console.error("Error loading doctor appointments inner pipe:", err);
              //     this.errorMessage = "Failed to load appointments.";
              //     this.isLoading = false;
              //     return of([]);
              // })
              // startWith(null) // Removed: Let isLoading handle the initial empty state
          );
        })
    );
    // Assign to class property
    this.appointments$ = obs$;

    // Subscribe separately for error handling (or rely on async pipe error handling)
    // Add null check for safety before subscribing
    this.appointments$?.subscribe({
        // next: () => { /* Optional: Log success */ }, // Not needed if just displaying data
        error: err => {
             console.error("Error loading doctor appointments:", err);
             this.errorMessage = "Failed to load appointments.";
             this.isLoading = false;
        }
    });
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
    this.notesForm.setErrors(null); // Clear previous submit errors
  }

  submitConsultationNotes(): void {
    if (this.notesForm.invalid || !this.selectedAppointment) {
        this.notesForm.markAllAsTouched(); // Mark fields to show errors
        return;
    }

    this.isSubmittingNotes = true;
    const notes = this.notesForm.value.consultation_notes;
    this.notesForm.setErrors(null); // Clear previous errors

    this.apiService.completeAppointment(this.selectedAppointment.id, notes)
      .subscribe({
        next: () => {
          console.log('Appointment completed successfully');
          this.closeNotesModal();
          // Manually update the list item status for immediate feedback
          // Or trigger a full refresh (simpler)
          this.loadAppointments();
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

// Define ApiParams type if not globally available
type ApiParams = { [param: string]: string | number | boolean };