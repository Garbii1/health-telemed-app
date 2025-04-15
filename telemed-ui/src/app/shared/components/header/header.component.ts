// src/app/shared/components/header/header.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ CommonModule, RouterLink, RouterLinkActive ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;
  userRole: string | null = null;
  userInfo: UserInfo | null = null;
  private authSubscription?: Subscription;
  private roleSubscription?: Subscription;
  private userSubscription?: Subscription;

  // This property controls the mobile menu visibility
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
    this.toggleMenu(false); // Close menu on logout
    this.authService.logout();
  }

  // This function toggles the menu state
  toggleMenu(forceState?: boolean): void {
      console.log('Toggling menu. Current state:', this.isMenuOpen); // Debug log
      if (typeof forceState === 'boolean') {
        this.isMenuOpen = forceState;
      } else {
        this.isMenuOpen = !this.isMenuOpen;
      }
      console.log('New menu state:', this.isMenuOpen); // Debug log
  }

  // Navigate and ensure menu closes
  navigate(path: string[]): void {
      this.toggleMenu(false); // Close menu after clicking a link
      this.router.navigate(path);
  }

  // Helper for template clicks that should close menu
  closeMenu(): void {
      this.toggleMenu(false);
  }
}