// src/app/features/doctor/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, async pipe, date pipe
import { RouterLink } from '@angular/router'; // For routerLink
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Observable, forkJoin, of } from 'rxjs'; // Import of
import { map, catchError } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true, // Add standalone
  imports: [
      CommonModule, // Provides *ngIf, *ngFor, async pipe, date pipe
      RouterLink, // Provides routerLink
      LoadingSpinnerComponent // Import child component
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit {
  currentUser: UserInfo | null = null;
  // Allow null for initial state or error
  dashboardStats$: Observable<{ upcomingAppointments: any[], totalPatients: number } | null> | undefined;
  isLoading = true;
  errorMessage: string | null = null; // Add error message property

  constructor(private authService: AuthService, private apiService: ApiService) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
    this.loadDashboardData();
  }

  loadDashboardData(): void {
     this.isLoading = true;
     this.errorMessage = null; // Reset error on load

     this.dashboardStats$ = forkJoin({
       appointments: this.apiService.getAppointments({ status: 'SCHEDULED', limit: 5, ordering: 'appointment_time' }).pipe(
           catchError(err => {
               console.error("Error fetching appointments:", err);
               this.errorMessage = "Could not load upcoming appointments.";
               return of([]); // Return empty on error
           })
        ),
       patients: this.apiService.getDoctorPatients().pipe(
            catchError(err => {
                console.error("Error fetching patients:", err);
                if (this.errorMessage) this.errorMessage += " Could not load patient list.";
                else this.errorMessage = "Could not load patient list.";
                return of([]); // Return empty on error
            })
        )
     }).pipe(
       map(results => {
         this.isLoading = false;
         return {
           upcomingAppointments: results.appointments,
           totalPatients: results.patients.length,
         };
       }),
       catchError(err => { // Catch errors from forkJoin itself
            console.error("Error loading doctor dashboard data:", err);
            this.isLoading = false;
            this.errorMessage = "Failed to load dashboard data.";
            return of(null); // Return null on overall error
       })
     );
   }

    formatDate(dateString: string | null): string {
       if (!dateString) return 'N/A';
       return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
     }
}