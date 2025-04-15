// src/app/features/patient/dashboard/dashboard.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Observable, forkJoin, of, Subject, tap } from 'rxjs'; // Import tap
import { map, catchError, takeUntil, finalize } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

interface DashboardData {
  upcomingAppointments: any[];
  recentVitals: any[];
}

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [ CommonModule, RouterLink, LoadingSpinnerComponent ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit, OnDestroy {
    currentUser: UserInfo | null = null;
    dashboardData: DashboardData | null = null; // Use a direct property instead of Observable
    isLoading = true;
    errorMessage: string | null = null;
    private destroy$ = new Subject<void>();

    constructor(
        private authService: AuthService,
        private apiService: ApiService,
        private cdRef: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
      console.log("PatientDashboardComponent OnInit");
      this.authService.currentUser$
        .pipe(takeUntil(this.destroy$))
        .subscribe(user => {
            this.currentUser = user;
            // No need to markForCheck here unless currentUser directly affects the template structure immediately
            // this.cdRef.markForCheck();
        });
      this.loadDashboardData();
    }

    ngOnDestroy(): void {
        console.log("PatientDashboardComponent OnDestroy");
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadDashboardData(): void {
       console.log("loadDashboardData called");
       this.isLoading = true; // Set loading true at the very start
       this.errorMessage = null;
       this.dashboardData = null; // Clear previous data
       this.cdRef.detectChanges(); // Manually trigger change detection for immediate loading state update

       const appointments$ = this.apiService.getAppointments({ status: 'SCHEDULED', limit: 5, ordering: 'appointment_time' }).pipe(
           tap(data => console.log("Appointments data received:", data)), // Log data received
           catchError(err => {
               console.error("Error fetching appointments:", err);
               this.errorMessage = "Could not load upcoming appointments.";
               return of([]); // Important: return empty array on error for forkJoin
           })
        );

       const vitals$ = this.apiService.getVitals({ limit: 5 }).pipe(
            tap(data => console.log("Vitals data received:", data)), // Log data received
            catchError(err => {
               console.error("Error fetching vitals:", err);
               if (!this.errorMessage) this.errorMessage = "Could not load recent vitals.";
               else this.errorMessage += " Could not load recent vitals.";
               return of([]); // Important: return empty array on error for forkJoin
           })
        );

       forkJoin({
         appointments: appointments$,
         vitals: vitals$
       })
       .pipe(
           // Use finalize to guarantee isLoading is set to false
           finalize(() => {
               console.log("forkJoin finalized. Setting isLoading = false");
               this.isLoading = false;
               this.cdRef.detectChanges(); // Trigger change detection after loading finishes
           }),
           takeUntil(this.destroy$) // Unsubscribe when component destroyed
        )
       .subscribe({
           next: (results) => {
               console.log("forkJoin next - Data received:", results);
               // We can directly assign the results here
               this.dashboardData = {
                 upcomingAppointments: Array.isArray(results.appointments) ? results.appointments : [],
                 recentVitals: Array.isArray(results.vitals) ? results.vitals : []
               };
               // No need to set isLoading false here if using finalize
               // this.isLoading = false;
               // this.cdRef.detectChanges(); // Let finalize handle the final CD trigger
           },
           error: (err) => { // Catch errors from forkJoin itself (less likely if inner catches work)
                console.error("Error in forkJoin subscribe:", err);
                this.errorMessage = this.errorMessage || "Failed to load all dashboard data."; // Keep specific errors if they occurred
                // isLoading is handled by finalize
           }
       });
     }

    // --- Helper Functions ---
    formatDate(dateString: string | null): string {
        if (!dateString) return 'N/A';
        try { return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
        catch(e) { return 'Invalid Date'; }
    }

    formatBP(systolic: number | null, diastolic: number | null): string {
        if (systolic === null && diastolic === null) return 'N/A';
        return `${systolic ?? '-'} / ${diastolic ?? '-'}`;
    }
}

// Define ApiParams type if not globally available
type ApiParams = { [param: string]: string | number | boolean };