// src/app/features/doctor/patient-list/patient-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, async pipe, date pipe
import { RouterLink } from '@angular/router'; // If using routerLink later
import { ApiService } from '../../../core/services/api.service';
import { Observable, of } from 'rxjs'; // Import of
import { catchError } from 'rxjs/operators'; // Import catchError
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // Import spinner

@Component({
  selector: 'app-patient-list',
  standalone: true, // Add standalone
  imports: [
      CommonModule, // Provides *ngIf, *ngFor, async pipe, date pipe
      RouterLink, // Needed if using routerLink in template
      LoadingSpinnerComponent // Import child component
  ],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss']
})
export class PatientListComponent implements OnInit {
  patients$: Observable<any[]> | undefined;
  isLoading = true; // Start loading true
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
         return of([]); // Return empty array on error
       }),
       // finalize(() => this.isLoading = false) // finalize doesn't work well with async pipe
       // We set isLoading=false implicitly when data arrives or error occurs
       map(data => { // Use map to set isLoading false when data is received
           this.isLoading = false;
           return data;
       })
    );
    // No need for manual subscribe if using async pipe, handle loading/error via flags
  }

   viewPatientDetails(patientId: number): void {
     // Replace alert with actual navigation when detail component exists
     // this.router.navigate(['/doctor/patients', patientId]);
     alert(`Navigate to details for patient ID: ${patientId} (Implement navigation)`);
   }
}