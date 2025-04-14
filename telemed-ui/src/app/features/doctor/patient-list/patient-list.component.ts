// src/app/features/doctor/patient-list/patient-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  loadPatients(): void { /* ... */ }
  viewPatientDetails(patientId: number): void { /* ... */ }
}