// src/app/features/patient/vitals/vitals.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';
import { VitalsFormComponent } from '../vitals-form/vitals-form.component';
import { VitalsHistoryComponent } from '../vitals-history/vitals-history.component';
// LoadingSpinnerComponent seems unused in this component's template based on previous logs
// import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-patient-vitals',
  standalone: true,
  imports: [
    CommonModule,
    VitalsFormComponent,
    VitalsHistoryComponent,
    // LoadingSpinnerComponent // Removed based on NG8113 warning
  ],
  templateUrl: './vitals.component.html',
  styleUrls: ['./vitals.component.scss']
})
export class PatientVitalsComponent implements OnInit {
  // ... (Logic remains the same) ...
    vitalsHistory$: Observable<any[]> | undefined; showForm: boolean = false; isLoading = true; errorMessage: string | null = null;
    constructor(private apiService: ApiService) { }
    ngOnInit(): void { this.loadVitalsHistory(); }
    loadVitalsHistory(): void { /* ... */ }
    toggleVitalForm(): void { /* ... */ }
    onVitalSubmitted(): void { /* ... */ }
}