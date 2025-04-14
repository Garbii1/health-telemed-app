// src/app/features/doctor/patient-list/patient-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <<< ADDED: For *ngIf, *ngFor, async pipe, date pipe
// RouterLink removed - unused warning
import { ApiService } from '../../../core/services/api.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators'; // <<< Ensure map is imported
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [
      CommonModule,
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

  ngOnInit(): void { this.loadPatients(); }

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
       map((data: any[]) => { // <<< Added type
           this.isLoading = false;
           return data;
       })
    );
  }

   viewPatientDetails(patientId: number): void { /* ... */ }
}