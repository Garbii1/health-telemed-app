// src/app/features/public/home/home.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf or other directives if used
import { RouterLink } from '@angular/router';   // <<< ADD RouterLink

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink // <<< ADD RouterLink here
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent { } // No other logic needed for simple navigation