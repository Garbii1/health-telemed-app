// src/app/features/patient/vitals-form/vitals-form.component.ts
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-vitals-form',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule ],
  templateUrl: './vitals-form.component.html',
  styleUrls: ['./vitals-form.component.scss']
})
export class VitalsFormComponent {
  @Output() vitalSubmitted = new EventEmitter<void>();
  // Fix: Initialize FormGroup
  vitalForm: FormGroup = this.fb.group({ /* ... controls ... */ });
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(private fb: FormBuilder, private apiService: ApiService) {
      // Initialize here or in declaration
      this.vitalForm = this.fb.group({ blood_pressure_systolic: [null, [Validators.min(50), Validators.max(300)]], blood_pressure_diastolic: [null, [Validators.min(30), Validators.max(200)]], heart_rate: [null, [Validators.min(30), Validators.max(250)]], glucose_level: [null, [Validators.min(0), Validators.max(1000)]], temperature: [null, [Validators.min(30), Validators.max(45)]], notes: [''] });
  }

  onSubmit(): void {
    console.log('Vitals Form onSubmit CALLED'); // <<< Is this function even called?
  
    console.log('Vitals Form Value:', this.vitalForm.value); // <<< What data is being submitted?
    console.log('Vitals Form Status:', this.vitalForm.status); // <<< Should be VALID
    console.log('Is Vitals Form Valid?:', this.vitalForm.valid); // <<< Should be true
  
    // Log individual control validity
    console.log('--- Vitals Control Validity ---');
    Object.keys(this.vitalForm.controls).forEach(key => {
      const control = this.vitalForm.get(key);
      console.log(`${key}: Status=${control?.status}, Value='${control?.value}', Errors=${JSON.stringify(control?.errors)}, Touched=${control?.touched}`);
    });
    console.log('-----------------------------');
  
  
    this.errorMessage = null;
    this.successMessage = null;
  
    if (this.vitalForm.invalid) {
      console.error("Vitals Form IS INVALID. Halting submission."); // <<< Log if invalid
      this.vitalForm.markAllAsTouched(); // Show errors
      this.errorMessage = "Please check the form for errors or ensure at least one vital is entered."; // Give user feedback
      return; // Stop
    }
  
    // Basic check: Ensure at least one vital sign is entered (already present, verify logic)
    const formData = this.vitalForm.value;
    const vitalValues = [ formData.blood_pressure_systolic, formData.blood_pressure_diastolic, formData.heart_rate, formData.glucose_level, formData.temperature ];
    // Check for null, undefined, OR empty string '' because form controls might return empty strings
    if (vitalValues.every(value => value === null || value === undefined || value === '')) {
        this.errorMessage = "Please enter at least one vital sign measurement.";
        console.error("No vital signs entered."); // <<< Log specific error
        return; // Stop if no actual values entered
    }
  
  
    // If it gets here, the form is valid and has at least one value
    console.log('Vitals Form IS VALID. Proceeding with API call...'); // <<< Log progress
  
    this.isLoading = true;
    this.apiService.addVitalRecord(formData)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: () => {
          console.log("API call SUCCESSFUL"); // <<< Log success
          this.successMessage = 'Vital record submitted successfully!';
          this.vitalForm.reset(); // Clear the form
          this.vitalSubmitted.emit(); // Notify parent component
          setTimeout(() => this.successMessage = null, 3000);
        },
        error: (err) => {
          console.error('Error submitting vitals API call:', err); // <<< Log API error
          this.errorMessage = err.error?.detail || 'Failed to submit vital record.';
        }
      });
  }

  // Fix: Ensure all getters used in template exist
  get systolic() { return this.vitalForm.get('blood_pressure_systolic'); }
  get diastolic() { return this.vitalForm.get('blood_pressure_diastolic'); }
  get heartRate() { return this.vitalForm.get('heart_rate'); }
  get glucose() { return this.vitalForm.get('glucose_level'); }
  get temperature() { return this.vitalForm.get('temperature'); }
}