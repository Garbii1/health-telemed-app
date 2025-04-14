import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-patient-list',
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss']
})
export class PatientListComponent implements OnInit {
  patients$: Observable<any[]> | undefined;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.patients$ = this.apiService.getDoctorPatients()
       // Add error handling if needed
       // .pipe(
       //   catchError(err => {
       //     this.errorMessage = "Failed to load patient list.";
       //     this.isLoading = false;
       //     return of([]); // Return empty array on error
       //   }),
       //    finalize(() => this.isLoading = false) // This won't work directly on the observable assigned
       // );

       // Handle loading/error state outside the observable assignment
        this.apiService.getDoctorPatients().subscribe({
          next: (data) => {
            this.patients$ = new Observable(observer => observer.next(data)); // Or just assign data to a regular array property
            this.isLoading = false;
          },
          error: (err) => {
            console.error("Error loading patients:", err);
            this.errorMessage = "Failed to load patient list.";
            this.isLoading = false;
             this.patients$ = new Observable(observer => observer.next([])); // Clear list on error
          }
        });
  }

   // Function to view patient details (navigate to detail route - implement later)
   viewPatientDetails(patientId: number): void {
     // this.router.navigate(['/doctor/patients', patientId]);
     alert(`Navigate to details for patient ID: ${patientId} (Implement navigation)`);
   }
}