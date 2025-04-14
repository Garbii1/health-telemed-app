// src/app/features/patient/vitals-history/vitals-history.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-vitals-history',
  standalone: true,
  imports: [
    CommonModule,
    NgxChartsModule
  ],
  templateUrl: './vitals-history.component.html',
  styleUrls: ['./vitals-history.component.scss']
})
export class VitalsHistoryComponent implements OnChanges {
  @Input() vitalsData: any[] | null = null;

  // Chart data arrays - ensure all used in template are defined
  bpChartData: any[] = [];
  hrChartData: any[] = []; // <<< ADDED based on template usage
  glucoseChartData: any[] = []; // <<< ADDED based on template usage
  tempChartData: any[] = []; // <<< ADDED based on template usage

  // Chart options - ensure all used in template bindings are defined
  view: [number, number] = [700, 300];
  legend: boolean = true; // <<< ADDED based on template binding [legend]
  showLabels: boolean = true;
  animations: boolean = true;
  xAxis: boolean = true; // <<< ADDED based on template binding [xAxis]
  yAxis: boolean = true; // <<< ADDED based on template binding [yAxis]
  showYAxisLabel: boolean = true;
  showXAxisLabel: boolean = true;
  xAxisLabel: string = 'Date'; // <<< ADDED based on template binding [xAxisLabel]
  timeline: boolean = true; // <<< ADDED based on template binding [timeline]
  // Define ALL color schemes used in template
  colorSchemeBP: Color = { domain: ['#5AA454', '#E44D25'], group: ScaleType.Ordinal, selectable: true, name: 'BP' }; // <<< ENSURE DEFINED
  colorSchemeHR: Color = { domain: ['#C7B42C'], group: ScaleType.Ordinal, selectable: true, name: 'HR' }; // <<< ADDED
  colorSchemeGlucose: Color = { domain: ['#A10A28'], group: ScaleType.Ordinal, selectable: true, name: 'Glucose' }; // <<< ADDED
  colorSchemeTemp: Color = { domain: ['#4a90e2'], group: ScaleType.Ordinal, selectable: true, name: 'Temp' }; // <<< ADDED

  ngOnChanges(changes: SimpleChanges): void {
    // ... (ngOnChanges logic remains the same) ...
      if (changes['vitalsData'] && this.vitalsData) { this.processChartData(this.vitalsData); } else if (changes['vitalsData'] && !this.vitalsData) { /* clear charts */ }
  }

  private processChartData(data: any[]): void {
    // ... (processChartData logic remains the same) ...
      const sortedData = [...data].sort((a, b) => new Date(a.record_time).getTime() - new Date(b.record_time).getTime()); const bpSystolicSeries = { name: 'Systolic', series: [] as { name: Date, value: number }[] }; const bpDiastolicSeries = { name: 'Diastolic', series: [] as { name: Date, value: number }[] }; const hrSeries = { name: 'Heart Rate', series: [] as { name: Date, value: number }[] }; const glucoseSeries = { name: 'Glucose', series: [] as { name: Date, value: number }[] }; const tempSeries = { name: 'Temperature', series: [] as { name: Date, value: number }[] }; sortedData.forEach(record => { /* push data */ }); this.bpChartData = [bpSystolicSeries, bpDiastolicSeries].filter(s => s.series.length > 0); this.hrChartData = hrSeries.series.length > 0 ? [hrSeries] : []; this.glucoseChartData = glucoseSeries.series.length > 0 ? [glucoseSeries] : []; this.tempChartData = tempSeries.series.length > 0 ? [tempSeries] : [];
  }

   formatDate(dateString: string | null): string {
     // Fix: Ensure return value
     if (!dateString) return 'N/A'; try { return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); } catch(e) { return 'Invalid Date'; }
   }
}