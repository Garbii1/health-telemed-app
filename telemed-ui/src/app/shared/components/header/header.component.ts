// src/app/shared/components/header/header.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // <<< ADDED: For *ngIf
import { RouterLink, RouterLinkActive, Router } from '@angular/router'; // <<< ADDED: For routing directives
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
      CommonModule,
      RouterLink,
      RouterLinkActive // <<< ADDED
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  // ... (Component logic remains the same) ...
  isLoggedIn: boolean = false; userRole: string | null = null; userInfo: UserInfo | null = null; private authSubscription: Subscription | undefined; private roleSubscription: Subscription | undefined; private userSubscription: Subscription | undefined; isMenuOpen: boolean = false;
  constructor(private authService: AuthService, private router: Router) { }
  ngOnInit(): void { /* ... */ }
  ngOnDestroy(): void { /* ... */ }
  logout(): void { /* ... */ }
  toggleMenu(forceState?: boolean): void { /* ... */ }
  navigate(path: string[]): void { /* ... */ }
}