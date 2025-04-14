import { Component, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-vitals-form',
  templateUrl: './vitals-form.component.html',
  styleUrls: ['./vitals-form.component.scss']
})
export class VitalsFormComponent {
  @Output() vitalSubmitted = new EventEmitter<void>();
  vitalForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(private fb: FormBuilder, private apiService: ApiService) {
    this.vitalForm = this.fb.group({
      // Use null default for optional number fields to avoid sending 0 if empty
      blood_pressure_systolic: [null, [Validators.min(50), Validators.max(300)]],
      blood_pressure_diastolic: [null, [Validators.min(30), Validators.max(200)]],
      heart_rate: [null, [Validators.min(30), Validators.max(250)]],
      glucose_level: [null, [Validators.min(0), Validators.max(1000)]], // Adjust range as needed
      temperature: [null, [Validators.min(30), Validators.max(45)]], // Celsius example range
      notes: ['']
      // record_time is set by the backend automatically
    });
  }

  onSubmit(): void {
     this.errorMessage = null;
     this.successMessage = null;
     if (this.vitalForm.invalid) {
       this.vitalForm.markAllAsTouched();
       console.log("Form invalid:", this.vitalForm.errors);
       return;
     }

    // Filter out null or empty values before sending? Or let backend handle nullable fields.
    // Let's send all fields, backend models allow null.
     const formData = this.vitalForm.value;

     // Basic check: Ensure at least one vital sign is entered
     const vitalValues = [
         formData.blood_pressure_systolic,
         formData.blood_pressure_diastolic,
         formData.heart_rate,
         formData.glucose_level,
         formData.temperature
        ];
     if (vitalValues.every(value => value === null || value === '')) {
        this.errorMessage = "Please enter at least one vital sign measurement.";
        return;
      }


     this.isLoading = true;
     this.apiService.addVitalRecord(formData)
       .pipe(finalize(() => this.isLoading = false))
       .subscribe({
         next: () => {
           this.successMessage = 'Vital record submitted successfully!';
           this.vitalForm.reset(); // Clear the form
           this.vitalSubmitted.emit(); // Notify parent component
           // Optionally hide success message after a delay
           setTimeout(() => this.successMessage = null, 3000);
         },
         error: (err) => {
           console.error('Error submitting vitals:', err);
           this.errorMessage = err.error?.detail || 'Failed to submit vital record.';
         }
       });
   }

    // Getters for cleaner template validation
    get systolic() { return this.vitalForm.get('blood_pressure_systolic'); }
    get diastolic() { return this.vitalForm.get('blood_pressure_diastolic'); }
    get heartRate() { return this.vitalForm.get('heart_rate'); }
    get glucose() { return this.vitalForm.get('glucose_level'); }
    get temperature() { return this.vitalForm.get('temperature'); }
}