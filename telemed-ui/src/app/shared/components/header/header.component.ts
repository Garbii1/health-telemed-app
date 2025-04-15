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
  isMenuOpen: boolean = false;

  constructor(private authService: AuthService, private router: Router) { }
  ngOnInit(): void { /* ... subscriptions ... */ }
  ngOnDestroy(): void { /* ... unsubscribes ... */ }
  logout(): void { /* ... logic ... */ }

  // Function should toggle the boolean
  toggleMenu(forceState?: boolean): void {
      console.log('Toggling menu. Current state:', this.isMenuOpen); // <<< DEBUG
      if (typeof forceState === 'boolean') { this.isMenuOpen = forceState; }
      else { this.isMenuOpen = !this.isMenuOpen; }
      console.log('New menu state:', this.isMenuOpen); // <<< DEBUG
  }

  // Function should close menu and navigate
  navigate(path: string[]): void {
      this.closeMenu(); // Ensure menu closes
      this.router.navigate(path);
  }
  // Helper specifically for template clicks
  closeMenu(): void {
      this.toggleMenu(false);
  }
}