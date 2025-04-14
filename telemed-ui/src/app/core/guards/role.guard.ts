import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    const expectedRoles = route.data['expectedRoles'] as Array<string>; // Get roles from route data

    if (!expectedRoles || expectedRoles.length === 0) {
      console.warn('RoleGuard: No expected roles defined for this route.');
      return true; // No roles specified, allow access (or deny based on policy)
    }

    return this.authService.currentUserRole$.pipe(
       take(1), // Take the current role value
       map(currentRole => {
         if (!currentRole) {
            console.log('RoleGuard: No current role found, denying access.');
            // If no role but guard is active, likely needs login or profile fetch pending
            // Redirect to login or a generic dashboard/home?
            return this.router.createUrlTree(['/login']); // Or maybe '/'
         }

         const hasRole = expectedRoles.some(role => role.toUpperCase() === currentRole.toUpperCase());

         if (hasRole) {
            console.log(`RoleGuard: Access granted. User role: ${currentRole}, Expected: ${expectedRoles}`);
           return true; // User has one of the expected roles
         } else {
           console.log(`RoleGuard: Access denied. User role: ${currentRole}, Expected: ${expectedRoles}`);
           // Redirect to an appropriate page (e.g., home or unauthorized page)
           // Determine redirect based on current role?
           if (currentRole.toUpperCase() === 'PATIENT') {
                return this.router.createUrlTree(['/patient/dashboard']);
           } else if (currentRole.toUpperCase() === 'DOCTOR') {
                return this.router.createUrlTree(['/doctor/dashboard']);
           } else {
               return this.router.createUrlTree(['/']); // Fallback to home
           }
         }
       }),
        tap(hasAccess => {
          if (!hasAccess) {
            console.log('RoleGuard: Navigation cancelled due to role mismatch.');
          }
        })
    );
  }
}