// src/app/features/patient/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [ CommonModule, RouterLink, LoadingSpinnerComponent ],
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

    loadDashboardData(): void { /* ... same logic ... */ }

    // Fix TS2355: Ensure all paths return a string
    formatDate(dateString: string | null): string {
        if (!dateString) {
           return 'N/A'; // <<< Return string
        }
        try {
           return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); // <<< Return string
        } catch(e) {
           return 'Invalid Date'; // <<< Return string
        }
    }

    // Fix TS2355: Ensure all paths return a string
    formatBP(systolic: number | null, diastolic: number | null): string {
        if (systolic === null && diastolic === null) {
           return 'N/A'; // <<< Return string
        }
        return `${systolic ?? '-'} / ${diastolic ?? '-'}`; // <<< Return string
    }
}

type ApiParams = { [param: string]: string | number | boolean };