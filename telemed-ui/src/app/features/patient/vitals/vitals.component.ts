// src/app/features/patient/vitals/vitals.component.ts
import { Component, OnInit } from '@angular/core'; // Added Component, OnInit
import { CommonModule } from '@angular/common'; // For *ngIf, async pipe
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';
// Import standalone child components
import { VitalsFormComponent } from '../vitals-form/vitals-form.component';
import { VitalsHistoryComponent } from '../vitals-history/vitals-history.component';

@Component({
  selector: 'app-patient-vitals',
  standalone: true, // Add standalone
  imports: [
    CommonModule, // For *ngIf, async pipe
    VitalsFormComponent, // Import child
    VitalsHistoryComponent // Import child
  ],
  templateUrl: './vitals.component.html',
  styleUrls: ['./vitals.component.scss']
})
export class PatientVitalsComponent implements OnInit { // Implement OnInit
  vitalsHistory$: Observable<any[]> | undefined;
  showForm: boolean = false;
  isLoading = true; // Add loading state
  errorMessage: string | null = null; // Add error state

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadVitalsHistory();
  }

  loadVitalsHistory(): void {
    this.isLoading = true; // Set loading true
    this.errorMessage = null; // Reset error
    this.vitalsHistory$ = this.apiService.getVitals(); // Direct assignment is fine with async pipe

    // Optional: Add error handling if needed beyond async pipe
    this.vitalsHistory$.subscribe({
        next: () => this.isLoading = false, // Set loading false on data arrival
        error: (err) => {
            console.error("Error loading vitals history:", err);
            this.errorMessage = "Failed to load vitals history.";
            this.isLoading = false; // Set loading false on error
        }
    });
  }

  toggleVitalForm(): void {
     this.showForm = !this.showForm;
   }

  onVitalSubmitted(): void {
    this.loadVitalsHistory(); // Refresh the history list
    this.showForm = false; // Hide the form after successful submission
  }
}