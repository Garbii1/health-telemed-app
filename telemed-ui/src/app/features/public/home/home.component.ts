// src/app/features/public/home/home.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core'; // Import OnInit, OnDestroy
import { CommonModule } from '@angular/common'; // Import CommonModule for *ngFor
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, // Needed for *ngFor and *ngIf
    RouterLink
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy { // Implement OnInit, OnDestroy

  // Array of background image URLs relative to the 'assets' folder
  backgroundImages: string[] = [
    '/assets/hero-background.jpeg',       // Your original image
    '/assets/hero-background-2.jpeg',     // Add second image path      // Add third image path
    '/assets/hero-background-4.jpg',
    '/assets/hero-background-7.jpg',
    '/assets/hero-background-8.jpeg',
    '/assets/hero-background-9.jpeg'
  ];

  currentImageIndex = 0; // Index of the currently active image
  private intervalId: any = null; // To store the interval timer ID

  ngOnInit(): void {
    // Preload images (optional but improves user experience)
    this.preloadImages();

    // Start the image cycling interval
    this.intervalId = setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.backgroundImages.length;
      // console.log('Changing background index to:', this.currentImageIndex); // For debugging
    }, 7000); // Change image every 7 seconds (adjust timing as desired)
  }

  ngOnDestroy(): void {
    // Clear the interval when the component is destroyed to prevent memory leaks
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  // Function to preload images in the background
  private preloadImages(): void {
    this.backgroundImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }
}