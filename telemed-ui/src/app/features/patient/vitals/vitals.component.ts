import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-patient-vitals',
  templateUrl: './vitals.component.html',
  styleUrls: ['./vitals.component.scss']
})
export class PatientVitalsComponent implements OnInit {
  vitalsHistory$: Observable<any[]> | undefined; // Observable for history
  showForm: boolean = false; // Toggle form visibility

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadVitalsHistory();
  }

  loadVitalsHistory(): void {
    // Fetch vitals history for the logged-in patient
    this.vitalsHistory$ = this.apiService.getVitals();
  }

  toggleVitalForm(): void {
     this.showForm = !this.showForm;
   }

  // Handle event when new vital is submitted from the form component
  onVitalSubmitted(): void {
    this.loadVitalsHistory(); // Refresh the history list
    this.showForm = false; // Hide the form after successful submission
  }
}