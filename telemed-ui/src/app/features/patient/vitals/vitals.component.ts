// src/app/features/patient/vitals/vitals.component.ts
import { Component, OnInit } from '@angular/core'; // Import Component, OnInit
import { CommonModule } from '@angular/common'; // For *ngIf, async pipe
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs'; // Import Observable
// Import standalone child components
import { VitalsFormComponent } from '../vitals-form/vitals-form.component';
import { VitalsHistoryComponent } from '../vitals-history/vitals-history.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // Import spinner


@Component({ // Add Decorator
  selector: 'app-patient-vitals',
  standalone: true,
  imports: [
    CommonModule,
    VitalsFormComponent,
    VitalsHistoryComponent,
    LoadingSpinnerComponent // Import spinner
  ],
  templateUrl: './vitals.component.html',
  styleUrls: ['./vitals.component.scss']
})
export class PatientVitalsComponent implements OnInit { // Implement OnInit
  vitalsHistory$: Observable<any[]> | undefined;
  showForm: boolean = false;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadVitalsHistory();
  }

  loadVitalsHistory(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.vitalsHistory$ = this.apiService.getVitals();

    // Add loading false and error handling
    this.vitalsHistory$.subscribe({
        // Using finalize might be better if the async pipe is not always subscribed
        // finalize: () => this.isLoading = false,
        next: () => this.isLoading = false, // Set loading false on data
        error: (err) => {
            console.error("Error loading vitals history:", err);
            this.errorMessage = "Failed to load vitals history.";
            this.isLoading = false;
        }
    });
  }

  toggleVitalForm(): void {
     this.showForm = !this.showForm;
   }

  onVitalSubmitted(): void {
    this.loadVitalsHistory();
    this.showForm = false;
  }
}