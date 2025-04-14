// src/app/shared/components/loading-spinner/loading-spinner.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf

@Component({
  selector: 'app-loading-spinner',
  standalone: true, // Add standalone
  imports: [ CommonModule ], // For *ngIf
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent {
  @Input() isLoading: boolean = false;
  @Input() message: string = 'Loading...';
}