// src/app/features/patient/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, async pipe, slice pipe
import { RouterLink } from '@angular/router'; // For routerLink
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [
      CommonModule,
      RouterLink,
      LoadingSpinnerComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit {
  // ... (Component logic remains the same) ...
    currentUser: UserInfo | null = null;
    dashboardData$: Observable<{ upcomingAppointments: any[], recentVitals: any[] } | null> | undefined;
    isLoading = true;
    errorMessage: string | null = null;
    constructor(private authService: AuthService, private apiService: ApiService) { }
    ngOnInit(): void { /* ... */ }
    loadDashboardData(): void { /* ... */ }
    formatDate(dateString: string | null): string { /* ... */ }
    formatBP(systolic: number | null, diastolic: number | null): string { /* ... */ }
}

type ApiParams = { [param: string]: string | number | boolean };