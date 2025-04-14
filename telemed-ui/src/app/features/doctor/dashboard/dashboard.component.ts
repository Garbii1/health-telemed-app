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
    // currentUser could still be null initially, so keep optional chaining in subscribe
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
    this.loadDashboardData();
  }

  loadDashboardData(): void { /* ... same logic ... */ }

  formatDate(dateString: string | null): string { /* ... same logic ... */ }
}

type ApiParams = { [param: string]: string | number | boolean };

// Fix in template:
// src/app/features/doctor/dashboard/dashboard.component.html

// Change this:
// <p *ngIf="currentUser">Welcome back, Dr. {{ currentUser?.username }}!</p>
// To this (?. is redundant inside *ngIf="currentUser"):
// <p *ngIf="currentUser">Welcome back, Dr. {{ currentUser.username }}!</p>

// Change this:
// <p class="card-text display-4">{{ stats.upcomingAppointments?.length || 0 }}</p>
// To this (assuming upcomingAppointments is always an array, even if empty, due to catchError returning of([])):
// <p class="card-text display-4">{{ stats.upcomingAppointments.length || 0 }}</p>