// src/app/features/patient/vitals/vitals.component.ts
import { Component, OnInit } from '@angular/core'; // <<< Import Component, OnInit
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';
import { VitalsFormComponent } from '../vitals-form/vitals-form.component';
import { VitalsHistoryComponent } from '../vitals-history/vitals-history.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // <<< ADDED (Even if unused warning appeared, it might be needed conditionally)

@Component({ // <<< Add decorator
  selector: 'app-patient-vitals',
  standalone: true,
  imports: [
    CommonModule,
    VitalsFormComponent,
    VitalsHistoryComponent,
    LoadingSpinnerComponent // <<< ADDED
  ],
  templateUrl: './vitals.component.html',
  styleUrls: ['./vitals.component.scss']
})
export class PatientVitalsComponent implements OnInit { // <<< Implement OnInit
  vitalsHistory$: Observable<any[]> | undefined;
  showForm: boolean = false;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void { this.loadVitalsHistory(); }
  loadVitalsHistory(): void { /* ... logic remains the same ... */ }
  toggleVitalForm(): void { /* ... */ }
  onVitalSubmitted(): void { /* ... */ }
}