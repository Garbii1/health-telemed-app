// features/doctor/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-doctor-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit {
  currentUser: UserInfo | null = null;
  dashboardStats$: Observable<any> | undefined;
  isLoading = true;

  constructor(private authService: AuthService, private apiService: ApiService) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
    this.loadDashboardData();
  }

  loadDashboardData(): void {
     this.isLoading = true;
     // Fetch multiple pieces of data concurrently
     this.dashboardStats$ = forkJoin({
       // Fetch upcoming appointments (e.g., scheduled for today or future)
       appointments: this.apiService.getAppointments({ status: 'SCHEDULED', limit: 5, ordering: 'appointment_time' }), // Add params as needed
       // Fetch total number of assigned patients
       patients: this.apiService.getDoctorPatients()
     }).pipe(
       map(results => {
         this.isLoading = false;
         // Process results into a summary object
         return {
           upcomingAppointments: results.appointments,
           totalPatients: results.patients.length,
           // Add more stats as needed
         };
       })
     );

     // Handle errors
      this.dashboardStats$.subscribe({
        error: err => {
           console.error("Error loading doctor dashboard data:", err);
           this.isLoading = false;
           // Show error message on template
        }
      });
   }

    formatDate(dateString: string): string {
       if (!dateString) return 'N/A';
       return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
     }
}