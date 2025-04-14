// src/app/shared/components/header/header.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf
import { RouterLink, RouterLinkActive, Router } from '@angular/router'; // For routing directives
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true, // Add standalone
  imports: [
      CommonModule, // For *ngIf
      RouterLink, // For routerLink
      RouterLinkActive // For routerLinkActive
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy { // Logic remains the same
  isLoggedIn: boolean = false;
  userRole: string | null = null;
  userInfo: UserInfo | null = null;
  private authSubscription: Subscription | undefined;
  private roleSubscription: Subscription | undefined;
  private userSubscription: Subscription | undefined;
  isMenuOpen: boolean = false;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.authSubscription = this.authService.loggedIn$.subscribe(status => this.isLoggedIn = status);
    this.roleSubscription = this.authService.currentUserRole$.subscribe(role => this.userRole = role);
    this.userSubscription = this.authService.currentUser$.subscribe(user => this.userInfo = user);
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.roleSubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
  }

  logout(): void {
    this.toggleMenu(false);
    this.authService.logout();
  }

  toggleMenu(forceState?: boolean): void {
      if (typeof forceState === 'boolean') { this.isMenuOpen = forceState; }
      else { this.isMenuOpen = !this.isMenuOpen; }
  }

  navigate(path: string[]): void {
      this.toggleMenu(false);
      this.router.navigate(path);
  }
}