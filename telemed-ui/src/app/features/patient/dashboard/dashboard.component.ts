// src/app/features/patient/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, async pipe, slice pipe
import { RouterLink } from '@angular/router'; // For routerLink
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // Import spinner

@Component({
  selector: 'app-patient-dashboard',
  standalone: true, // Add standalone
  imports: [
      CommonModule, // For *ngIf, *ngFor, async pipe, slice pipe
      RouterLink, // For routerLink
      LoadingSpinnerComponent // Import child component
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit {
  currentUser: UserInfo | null = null;
  // Allow null type
  dashboardData$: Observable<{ upcomingAppointments: any[], recentVitals: any[] } | null> | undefined;
  isLoading = true; // Start loading true
  errorMessage: string | null = null;

  constructor(private authService: AuthService, private apiService: ApiService) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
    this.loadDashboardData();
  }

  loadDashboardData(): void {
     this.isLoading = true;
     this.errorMessage = null;

     this.dashboardData$ = forkJoin({
       appointments: this.apiService.getAppointments({ status: 'SCHEDULED', limit: 5, ordering: 'appointment_time' }).pipe(
           catchError(err => {
               console.error("Error fetching appointments:", err);
               this.errorMessage = "Could not load upcoming appointments.";
               return of([]);
           })
       ),
       vitals: this.apiService.getVitals({ limit: 5 }).pipe(
            catchError(err => {
               console.error("Error fetching vitals:", err);
               if (!this.errorMessage) this.errorMessage = "Could not load recent vitals.";
               else this.errorMessage += " Could not load recent vitals.";
               return of([]);
           })
       )
     }).pipe(
       map(results => {
         this.isLoading = false; // Set loading false when data arrives
         return {
           upcomingAppointments: results.appointments,
           recentVitals: results.vitals,
         };
       }),
       catchError(err => {
            console.error("Error loading dashboard data:", err);
            this.isLoading = false;
            this.errorMessage = "Failed to load dashboard data. Please try again later.";
            return of(null);
       })
     );
   }

   formatDate(dateString: string | null): string {
     if (!dateString) return 'N/A';
     return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
   }

    formatBP(systolic: number | null, diastolic: number | null): string {
      if (systolic === null && diastolic === null) return 'N/A';
      return `${systolic ?? '-'} / ${diastolic ?? '-'}`;
    }
}

// Define ApiParams type if not globally available
type ApiParams = { [param: string]: string | number | boolean };