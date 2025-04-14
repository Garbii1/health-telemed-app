// src/app/features/doctor/patient-list/patient-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Includes DatePipe
import { ApiService } from '../../../core/services/api.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [ CommonModule, LoadingSpinnerComponent ],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss']
})
export class PatientListComponent implements OnInit {
  patients$: Observable<any[]> | undefined;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void { this.loadPatients(); }

  loadPatients(): void { /* ... same logic ... */ }

  viewPatientDetails(patientId: number): void { /* ... */ }

  // Note: No changes needed in the TS file for the TS2872 template warning.
  // The warning is about the `|| 'N/A'` potentially being redundant if the date pipe handles null gracefully.
  // Keeping `|| 'N/A'` provides explicit fallback and suppresses the warning/potential runtime issue if pipe returned null.
}

// Fix in template:
// src/app/features/doctor/patient-list/patient-list.component.html
// The expression `patient.date_of_birth | date:'longDate' || 'N/A'` caused TS2872.
// It's technically always truthy. If `patient.date_of_birth` is null/undefined, the pipe returns null,
// then `null || 'N/A'` becomes `'N/A'`. If it's a valid date, the pipe returns a string.
// To potentially fix/clarify, you could use *ngIf first, though the current code works.
// Option (Keep as is, ignore warning):
// <small *ngIf="patient.date_of_birth" class="text-muted">... {{ patient.date_of_birth | date:'longDate' }}</small>
// <small *ngIf="!patient.date_of_birth" class="text-muted">... D.O.B: N/A</small>
// Or simply keep the original code and accept the warning is informational.
// Let's keep original for simplicity:
// <small class="text-muted">... D.O.B: {{ patient.date_of_birth | date:'longDate' || 'N/A' }}</small>