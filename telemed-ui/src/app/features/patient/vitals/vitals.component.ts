// src/app/features/patient/vitals/vitals.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { Observable, Subject } from 'rxjs';
import { finalize, takeUntil, tap } from 'rxjs/operators';
import { VitalsFormComponent } from '../vitals-form/vitals-form.component';
import { VitalsHistoryComponent } from '../vitals-history/vitals-history.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // <<< RE-ADD THIS IMPORT

@Component({
  selector: 'app-patient-vitals',
  standalone: true,
  imports: [
    CommonModule,
    VitalsFormComponent,
    VitalsHistoryComponent,
    LoadingSpinnerComponent // <<< ADD IT BACK TO IMPORTS ARRAY
  ],
  templateUrl: './vitals.component.html',
  styleUrls: ['./vitals.component.scss']
})
export class PatientVitalsComponent implements OnInit, OnDestroy {
  vitalsHistory$: Observable<any[]> | undefined;
  showForm: boolean = false;
  isLoading = true;
  errorMessage: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(private apiService: ApiService, private cdRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadVitalsHistory();
  }

  ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
  }

  loadVitalsHistory(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdRef.detectChanges();

    this.vitalsHistory$ = this.apiService.getVitals().pipe(
        tap(() => console.log("Vitals data stream received")),
        finalize(() => {
            console.log("Vitals loading finalized");
            this.isLoading = false;
            this.cdRef.detectChanges();
        }),
        takeUntil(this.destroy$)
    );

    this.vitalsHistory$.subscribe({
        error: (err) => {
            console.error("Error loading vitals history:", err);
            this.errorMessage = "Failed to load vitals history.";
            // isLoading handled by finalize
        }
        // No need for next here if async pipe handles data
    });
  }

  toggleVitalForm(): void {
     this.showForm = !this.showForm;
     // Optional: Add CD if needed, but likely not for simple toggle
     // this.cdRef.detectChanges();
   }

  onVitalSubmitted(): void {
    this.showForm = false;
    this.loadVitalsHistory(); // Refresh list after submit
  }
}