// src/app/features/doctor/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <<< ADDED: For *ngIf, *ngFor, async pipe, date pipe
import { RouterLink } from '@angular/router'; // <<< ADDED: For routerLink
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
// LoadingSpinnerComponent removed - unused warning

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [
      CommonModule,
      RouterLink,
     // LoadingSpinnerComponent // Removed - unused
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit {
  currentUser: UserInfo | null = null;
  dashboardStats$: Observable<{ upcomingAppointments: any[], totalPatients: number } | null> | undefined;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(private authService: AuthService, private apiService: ApiService) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
    this.loadDashboardData();
  }

  loadDashboardData(): void {
     this.isLoading = true; this.errorMessage = null;
     this.dashboardStats$ = forkJoin({
        appointments: this.apiService.getAppointments({ status: 'SCHEDULED', limit: 5, ordering: 'appointment_time' }).pipe(catchError(err => { /*...*/ return of([]); })),
        patients: this.apiService.getDoctorPatients().pipe(catchError(err => { /*...*/ return of([]); }))
     }).pipe(
       map(results => {
         this.isLoading = false;
         const upcomingAppointments = Array.isArray(results.appointments) ? results.appointments : [];
         const totalPatients = Array.isArray(results.patients) ? results.patients.length : 0;
         return { upcomingAppointments, totalPatients };
       }),
       catchError(err => { /*...*/ this.isLoading = false; this.errorMessage = "..."; return of(null); })
     );
   }

    formatDate(dateString: string | null): string {
       if (!dateString) return 'N/A';
       return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
     }
}

type ApiParams = { [param: string]: string | number | boolean };