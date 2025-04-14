// src/app/features/patient/vitals-form/vitals-form.component.ts
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // For forms
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-vitals-form',
  standalone: true, // Add standalone
  imports: [
    CommonModule, // For *ngIf
    ReactiveFormsModule // For [formGroup] etc.
  ],
  templateUrl: './vitals-form.component.html',
  styleUrls: ['./vitals-form.component.scss']
})
export class VitalsFormComponent { // Logic remains the same
  @Output() vitalSubmitted = new EventEmitter<void>();
  vitalForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(private fb: FormBuilder, private apiService: ApiService) {
    this.vitalForm = this.fb.group({
      blood_pressure_systolic: [null, [Validators.min(50), Validators.max(300)]],
      blood_pressure_diastolic: [null, [Validators.min(30), Validators.max(200)]],
      heart_rate: [null, [Validators.min(30), Validators.max(250)]],
      glucose_level: [null, [Validators.min(0), Validators.max(1000)]],
      temperature: [null, [Validators.min(30), Validators.max(45)]],
      notes: ['']
    });
  }

  onSubmit(): void {
     this.errorMessage = null;
     this.successMessage = null;
     if (this.vitalForm.invalid) {
       this.vitalForm.markAllAsTouched();
       return;
     }
     const formData = this.vitalForm.value;
     const vitalValues = [ formData.blood_pressure_systolic, formData.blood_pressure_diastolic, formData.heart_rate, formData.glucose_level, formData.temperature ];
     if (vitalValues.every(value => value === null || value === '' || value === undefined)) {
        this.errorMessage = "Please enter at least one vital sign measurement.";
        return;
      }

     this.isLoading = true;
     this.apiService.addVitalRecord(formData)
       .pipe(finalize(() => this.isLoading = false))
       .subscribe({
         next: () => {
           this.successMessage = 'Vital record submitted successfully!';
           this.vitalForm.reset();
           this.vitalSubmitted.emit();
           setTimeout(() => this.successMessage = null, 3000);
         },
         error: (err) => {
           console.error('Error submitting vitals:', err);
           this.errorMessage = err.error?.detail || 'Failed to submit vital record.';
         }
       });
   }

    get systolic() { return this.vitalForm.get('blood_pressure_systolic'); }
    get diastolic() { return this.vitalForm.get('blood_pressure_diastolic'); }
    get heartRate() { return this.vitalForm.get('heart_rate'); }
    get glucose() { return this.vitalForm.get('glucose_level'); }
    get temperature() { return this.vitalForm.get('temperature'); }
}