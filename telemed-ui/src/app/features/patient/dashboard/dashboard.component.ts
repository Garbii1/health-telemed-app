// src/app/features/patient/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <<< ADDED: For *ngIf, *ngFor, async pipe, slice pipe
import { RouterLink } from '@angular/router'; // <<< ADDED: For routerLink
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'; // <<< ADDED

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [
      CommonModule,
      RouterLink,
      LoadingSpinnerComponent // <<< ADDED
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit {
    currentUser: UserInfo | null = null;
    dashboardData$: Observable<{ upcomingAppointments: any[], recentVitals: any[] } | null> | undefined;
    isLoading = true;
    errorMessage: string | null = null;

    constructor(private authService: AuthService, private apiService: ApiService) { }

    ngOnInit(): void {
        this.authService.currentUser$.subscribe(user => this.currentUser = user);
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        // ... (loadDashboardData logic correct from previous version) ...
        this.isLoading = true; this.errorMessage = null; this.dashboardData$ = forkJoin({ appointments: this.apiService.getAppointments({ status: 'SCHEDULED', limit: 5, ordering: 'appointment_time' }).pipe(catchError(err => { /*...*/ return of([]); })), vitals: this.apiService.getVitals({ limit: 5 }).pipe(catchError(err => { /*...*/ return of([]); })) }).pipe( map(results => { this.isLoading = false; const upcomingAppointments = Array.isArray(results.appointments) ? results.appointments : []; const recentVitals = Array.isArray(results.vitals) ? results.vitals : []; return { upcomingAppointments, recentVitals }; }), catchError(err => { /*...*/ this.isLoading = false; this.errorMessage = "..."; return of(null); }) );
    }

    formatDate(dateString: string | null): string {
        if (!dateString) return 'N/A';
        // Ensure it returns string
        try {
           return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        } catch (e) {
           return 'Invalid Date';
        }
    }

    formatBP(systolic: number | null, diastolic: number | null): string {
        if (systolic === null && diastolic === null) return 'N/A';
        // Ensure it returns string
        return `${systolic ?? '-'} / ${diastolic ?? '-'}`;
    }
}

type ApiParams = { [param: string]: string | number | boolean };