// src/app/features/patient/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // For forms
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class PatientProfileComponent implements OnInit {
  // ... (Component logic remains the same) ...
  profileForm: FormGroup;
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  initialProfileData: any = null;
  constructor( private fb: FormBuilder, private apiService: ApiService ) { /* ... form init ... */ }
  ngOnInit(): void { this.loadProfile(); }
  loadProfile(): void { /* ... */ }
  formatDateForInput(dateStr: string | null): string | null { /* ... */ }
  onSubmit(): void { /* ... */ }
  get email() { /* ... */ } // etc.
}