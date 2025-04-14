import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;
  userRole: string | null = null;
  userInfo: UserInfo | null = null;
  private authSubscription: Subscription | undefined;
  private roleSubscription: Subscription | undefined;
  private userSubscription: Subscription | undefined;

  isMenuOpen: boolean = false; // For mobile menu toggle

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.authSubscription = this.authService.loggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
    this.roleSubscription = this.authService.currentUserRole$.subscribe(role => {
       this.userRole = role;
     });
     this.userSubscription = this.authService.currentUser$.subscribe(user => {
         this.userInfo = user;
       });
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

  toggleMenu(forceState?: boolean): void {
      if (typeof forceState === 'boolean') {
        this.isMenuOpen = forceState;
      } else {
        this.isMenuOpen = !this.isMenuOpen;
      }
    }

    // Navigate and close menu
    navigate(path: string[]): void {
        this.toggleMenu(false);
        this.router.navigate(path);
      }
}