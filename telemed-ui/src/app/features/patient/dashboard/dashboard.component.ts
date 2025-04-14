// features/patient/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Observable, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs'; // Import 'of' for error handling

@Component({
  selector: 'app-patient-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit {
  currentUser: UserInfo | null = null;
  dashboardData$: Observable<any> | undefined;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(private authService: AuthService, private apiService: ApiService) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
    this.loadDashboardData();
  }

  loadDashboardData(): void {
     this.isLoading = true;
     this.errorMessage = null;

     // Fetch upcoming appointments and recent vitals concurrently
     this.dashboardData$ = forkJoin({
       // Fetch SCHEDULED appointments, limit 5, ordered by soonest first
       appointments: this.apiService.getAppointments({ status: 'SCHEDULED', limit: 5, ordering: 'appointment_time' }).pipe(
           catchError(err => {
               console.error("Error fetching appointments:", err);
               this.errorMessage = "Could not load upcoming appointments."; // Set partial error
               return of([]); // Return empty array on error for this specific call
           })
       ),
       // Fetch recent vitals, limit 5 (default ordering is newest first based on model)
       vitals: this.apiService.getVitals({ limit: 5 }).pipe(
            catchError(err => {
               console.error("Error fetching vitals:", err);
               if (!this.errorMessage) this.errorMessage = "Could not load recent vitals."; // Append or set error
               else this.errorMessage += " Could not load recent vitals.";
               return of([]); // Return empty array on error
           })
       )
     }).pipe(
       map(results => {
         this.isLoading = false;
         // Return combined results
         return {
           upcomingAppointments: results.appointments,
           recentVitals: results.vitals,
           // Add more stats later if needed (e.g., total appointments, last vital entry date)
         };
       }),
       catchError(err => {
            // Catch potential errors from forkJoin itself (less likely if inner pipes catch)
            console.error("Error loading dashboard data:", err);
            this.isLoading = false;
            this.errorMessage = "Failed to load dashboard data. Please try again later.";
            return of(null); // Return null or default state on overall error
         })
     );
   }

   // Format date for display
   formatDate(dateString: string | null): string {
     if (!dateString) return 'N/A';
     // Using localeString for better formatting
     return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
   }

   // Format BP reading
    formatBP(systolic: number | null, diastolic: number | null): string {
      if (systolic === null && diastolic === null) return 'N/A';
      return `${systolic ?? '-'} / ${diastolic ?? '-'}`;
    }
}