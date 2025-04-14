import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return this.authService.loggedIn$.pipe(
      take(1), // Take the current value and complete
      map(isLoggedIn => {
        if (isLoggedIn) {
          return true; // Allow access if logged in
        } else {
          // Redirect to login page if not logged in
          console.log('AuthGuard: User not logged in, redirecting to login.');
          return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url }});
        }
      })
    );
  }
}