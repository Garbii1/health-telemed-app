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
    formatDate(dateString: string | null): string { /* ... Ensure returns string ... */ }
    formatBP(systolic: number | null, diastolic: number | null): string { /* ... Ensure returns string ... */ }
}

type ApiParams = { [param: string]: string | number | boolean };

// Fix in template:
// src/app/features/patient/dashboard/dashboard.component.html
// Change this:
// <p *ngIf="currentUser">Welcome, {{ currentUser?.username }}!</p>
// To this (remove redundant ?. inside *ngIf):
// <p *ngIf="currentUser">Welcome, {{ currentUser.username }}!</p>