// src/app/features/patient/vitals-history/vitals-history.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-vitals-history',
  standalone: true,
  imports: [ CommonModule, NgxChartsModule ],
  templateUrl: './vitals-history.component.html',
  styleUrls: ['./vitals-history.component.scss']
})
export class VitalsHistoryComponent implements OnChanges {
  @Input() vitalsData: any[] | null = null;

  // Chart data arrays - Defined
  bpChartData: any[] = [];
  hrChartData: any[] = [];
  glucoseChartData: any[] = [];
  tempChartData: any[] = [];

  // Chart options - Ensure all properties bound in template are defined here
  view: [number, number] = [700, 300];
  legend: boolean = true;
  // showLabels: boolean = true; // Not bound in provided template, remove if unused
  // animations: boolean = true; // Not bound in provided template, remove if unused
  xAxis: boolean = true;
  yAxis: boolean = true;
  showYAxisLabel: boolean = true;
  showXAxisLabel: boolean = true;
  xAxisLabel: string = 'Date';
  timeline: boolean = true;

  // Color schemes - Ensure all used are defined
  colorSchemeBP: Color = { domain: ['#5AA454', '#E44D25'], group: ScaleType.Ordinal, selectable: true, name: 'BP' };
  colorSchemeHR: Color = { domain: ['#C7B42C'], group: ScaleType.Ordinal, selectable: true, name: 'HR' };
  colorSchemeGlucose: Color = { domain: ['#A10A28'], group: ScaleType.Ordinal, selectable: true, name: 'Glucose' };
  colorSchemeTemp: Color = { domain: ['#4a90e2'], group: ScaleType.Ordinal, selectable: true, name: 'Temp' };

  ngOnChanges(changes: SimpleChanges): void { /* ... */ }
  private processChartData(data: any[]): void { /* ... */ }

  // Fix: Ensure return type
  formatDate(dateString: string | null): string {
     if (!dateString) return 'N/A'; try { return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); } catch(e) { return 'Invalid Date'; }
  }
}