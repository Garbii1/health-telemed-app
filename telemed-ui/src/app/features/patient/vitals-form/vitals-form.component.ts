// src/app/features/patient/vitals-form/vitals-form.component.ts
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms'; // For forms
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-vitals-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './vitals-form.component.html',
  styleUrls: ['./vitals-form.component.scss']
})
export class VitalsFormComponent {
  @Output() vitalSubmitted = new EventEmitter<void>();

  // Initialize form group directly
  vitalForm: FormGroup = this.fb.group({
      // Use null default for optional number fields to avoid sending 0 if empty
      // Added pattern validators to prevent non-numeric/decimal inputs if needed
      blood_pressure_systolic: [null, [Validators.min(50), Validators.max(300), Validators.pattern("^[0-9]*$")]],
      blood_pressure_diastolic: [null, [Validators.min(30), Validators.max(200), Validators.pattern("^[0-9]*$")]],
      heart_rate: [null, [Validators.min(30), Validators.max(250), Validators.pattern("^[0-9]*$")]],
      glucose_level: [null, [Validators.min(0), Validators.max(1000), Validators.pattern("^[0-9]+(\.[0-9]{1,2})?$")]], // Allow decimals
      temperature: [null, [Validators.min(30), Validators.max(45), Validators.pattern("^[0-9]+(\.[0-9]{1})?$")]], // Allow one decimal place
      notes: ['', Validators.maxLength(500)] // Max length for notes
  });

  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(private fb: FormBuilder, private apiService: ApiService) {
      // Form initialized above
  }

  onSubmit(): void {
    console.log('Vitals Form onSubmit CALLED'); // <<< DEBUG LOG

    console.log('Vitals Form Value:', this.vitalForm.value); // <<< DEBUG LOG
    console.log('Vitals Form Status:', this.vitalForm.status); // <<< DEBUG LOG
    console.log('Is Vitals Form Valid?:', this.vitalForm.valid); // <<< DEBUG LOG

    // Log individual control validity
    console.log('--- Vitals Control Validity ---');
    Object.keys(this.vitalForm.controls).forEach(key => {
      const control = this.vitalForm.get(key);
      // Use optional chaining ?. for safety as get() might return null
      console.log(`${key}: Status=${control?.status}, Value='${control?.value}', Errors=${JSON.stringify(control?.errors)}, Touched=${control?.touched}`);
    });
    console.log('-----------------------------');

    this.errorMessage = null; // Clear previous messages
    this.successMessage = null;

    // Mark all fields as touched FIRST to show potential errors from previous interactions
    this.vitalForm.markAllAsTouched();

    // Check overall form validity
    if (this.vitalForm.invalid) {
      console.error("Vitals Form IS INVALID based on validators. Halting submission."); // <<< DEBUG LOG
      this.errorMessage = "Please check the form for errors (e.g., values out of range)."; // More specific message
      return; // Stop execution
    }

    // Also check if at least one vital sign has a meaningful value entered
    const formData = this.vitalForm.value;
    const vitalValues = [
        formData.blood_pressure_systolic,
        formData.blood_pressure_diastolic,
        formData.heart_rate,
        formData.glucose_level,
        formData.temperature
       ];
    // Check for null, undefined, OR empty string ''
    if (vitalValues.every(value => value === null || value === undefined || value === '')) {
        this.errorMessage = "Please enter at least one vital sign measurement.";
        console.error("No vital signs entered by the user."); // <<< DEBUG LOG
        this.vitalForm.setErrors({ noValueEntered: true }); // Optionally set form-level error
        return; // Stop if no actual values entered
    }


    // If it gets here, the form is valid according to validators AND has at least one value
    console.log('Vitals Form IS VALID and has values. Proceeding with API call...'); // <<< DEBUG LOG

    this.isLoading = true;
    // Send formData which now contains the values
    this.apiService.addVitalRecord(formData)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: () => {
          console.log("API call SUCCESSFUL"); // <<< DEBUG LOG
          this.successMessage = 'Vital record submitted successfully!';
          this.vitalForm.reset(); // Clear the form fields after successful submission
          this.vitalSubmitted.emit(); // Notify parent component to refresh history
          // Hide success message after a delay
          setTimeout(() => this.successMessage = null, 3000);
        },
        error: (err) => {
          console.error('Error submitting vitals API call:', err); // <<< DEBUG LOG
          // Try to get more specific error from backend response
          if (err.error && typeof err.error === 'object') {
             let backendErrors = '';
             for (const key in err.error) {
                 if (err.error.hasOwnProperty(key)) {
                    const messages = Array.isArray(err.error[key]) ? err.error[key].join(', ') : err.error[key];
                    backendErrors += `- ${key}: ${messages}\n`;
                 }
             }
             this.errorMessage = `Failed to submit:\n${backendErrors.trim()}`;
          } else if (err.error?.detail) {
             this.errorMessage = err.error.detail;
          } else if (err.message) {
              this.errorMessage = `Failed to submit: ${err.message}`;
          }
          else {
             this.errorMessage = 'Failed to submit vital record due to an unexpected error.';
          }
        }
      });
  }

    // Getters for template validation access
    get systolic(): AbstractControl | null { return this.vitalForm.get('blood_pressure_systolic'); }
    get diastolic(): AbstractControl | null { return this.vitalForm.get('blood_pressure_diastolic'); }
    get heartRate(): AbstractControl | null { return this.vitalForm.get('heart_rate'); }
    get glucose(): AbstractControl | null { return this.vitalForm.get('glucose_level'); }
    get temperature(): AbstractControl | null { return this.vitalForm.get('temperature'); }
    get notes(): AbstractControl | null { return this.vitalForm.get('notes'); }
}