// src/app/features/doctor/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [ CommonModule, RouterLink ],
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

  loadDashboardData(): void { /* ... same logic ... */ }

  // Fix: Ensure function always returns a string value
  formatDate(dateString: string | null): string {
     if (!dateString) {
       return 'N/A'; // Return string for null input
     }
     try {
       // Return the formatted string
       return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
     } catch(e) {
       return 'Invalid Date'; // Return string for invalid date
     }
  }
}

type ApiParams = { [param: string]: string | number | boolean };