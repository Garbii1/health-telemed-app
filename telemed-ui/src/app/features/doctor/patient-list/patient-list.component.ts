// src/app/features/doctor/patient-list/patient-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Import DatePipe explicitly if needed, though usually provided by CommonModule
// RouterLink removed as unused
import { ApiService } from '../../../core/services/api.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators'; // Import map
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [
      CommonModule, // Provides NgIf, NgFor, AsyncPipe, DatePipe etc.
      // RouterLink, // Removed - unused
      LoadingSpinnerComponent
  ],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss']
})
export class PatientListComponent implements OnInit {
  patients$: Observable<any[]> | undefined;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.patients$ = this.apiService.getDoctorPatients().pipe(
       catchError(err => {
         console.error("Error loading patients:", err);
         this.errorMessage = "Failed to load patient list.";
         this.isLoading = false;
         return of([]);
       }),
       map((data: any[]) => { // Added type annotation
           this.isLoading = false;
           return data;
       })
    );
  }

   viewPatientDetails(patientId: number): void {
     alert(`Navigate to details for patient ID: ${patientId} (Implement navigation)`);
   }
}