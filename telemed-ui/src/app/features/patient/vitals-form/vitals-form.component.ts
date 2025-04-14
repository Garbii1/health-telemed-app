// src/app/features/patient/vitals-form/vitals-form.component.ts
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common'; // <<< ADDED: For *ngIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // <<< ADDED: For forms
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-vitals-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule // <<< ADDED
  ],
  templateUrl: './vitals-form.component.html',
  styleUrls: ['./vitals-form.component.scss']
})
export class VitalsFormComponent {
  @Output() vitalSubmitted = new EventEmitter<void>();
  // Fix: Initialize form group
  vitalForm: FormGroup = this.fb.group({
      blood_pressure_systolic: [null, [Validators.min(50), Validators.max(300)]],
      blood_pressure_diastolic: [null, [Validators.min(30), Validators.max(200)]],
      heart_rate: [null, [Validators.min(30), Validators.max(250)]],
      glucose_level: [null, [Validators.min(0), Validators.max(1000)]],
      temperature: [null, [Validators.min(30), Validators.max(45)]],
      notes: ['']
  });
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(private fb: FormBuilder, private apiService: ApiService) {
      // Initialization moved to declaration
  }

  onSubmit(): void { /* ... logic remains the same ... */ }

  // Fix: Ensure getters return AbstractControl or null
  get systolic() { return this.vitalForm.get('blood_pressure_systolic'); }
  get diastolic() { return this.vitalForm.get('blood_pressure_diastolic'); }
  get heartRate() { return this.vitalForm.get('heart_rate'); }
  get glucose() { return this.vitalForm.get('glucose_level'); }
  get temperature() { return this.vitalForm.get('temperature'); }
}