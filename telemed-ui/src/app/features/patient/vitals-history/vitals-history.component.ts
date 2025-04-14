// src/app/features/patient/vitals-history/vitals-history.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts'; // Import NgxChartsModule

@Component({
  selector: 'app-vitals-history',
  standalone: true, // Add standalone
  imports: [
    CommonModule, // For *ngIf, *ngFor
    NgxChartsModule // Import NgxChartsModule HERE
  ],
  templateUrl: './vitals-history.component.html',
  styleUrls: ['./vitals-history.component.scss']
})
export class VitalsHistoryComponent implements OnChanges { // Logic remains the same
  @Input() vitalsData: any[] | null = null;

  // Chart data arrays
  bpChartData: any[] = [];
  hrChartData: any[] = [];
  glucoseChartData: any[] = [];
  tempChartData: any[] = [];

  // Chart options
  view: [number, number] = [700, 300];
  legend: boolean = true;
  showLabels: boolean = true;
  animations: boolean = true;
  xAxis: boolean = true;
  yAxis: boolean = true;
  showYAxisLabel: boolean = true;
  showXAxisLabel: boolean = true;
  xAxisLabel: string = 'Date';
  timeline: boolean = true;

  // Color schemes
  colorSchemeBP: Color = { domain: ['#5AA454', '#E44D25'], group: ScaleType.Ordinal, selectable: true, name: 'BP' };
  colorSchemeHR: Color = { domain: ['#C7B42C'], group: ScaleType.Ordinal, selectable: true, name: 'HR' };
  colorSchemeGlucose: Color = { domain: ['#A10A28'], group: ScaleType.Ordinal, selectable: true, name: 'Glucose' };
  colorSchemeTemp: Color = { domain: ['#4a90e2'], group: ScaleType.Ordinal, selectable: true, name: 'Temp' };


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vitalsData'] && this.vitalsData) {
      this.processChartData(this.vitalsData);
    } else if (changes['vitalsData'] && !this.vitalsData) {
        // Clear charts if input data becomes null/undefined
        this.bpChartData = [];
        this.hrChartData = [];
        this.glucoseChartData = [];
        this.tempChartData = [];
    }
  }

  private processChartData(data: any[]): void {
    const sortedData = [...data].sort((a, b) => new Date(a.record_time).getTime() - new Date(b.record_time).getTime());

    const bpSystolicSeries = { name: 'Systolic', series: [] as { name: Date, value: number }[] };
    const bpDiastolicSeries = { name: 'Diastolic', series: [] as { name: Date, value: number }[] };
    const hrSeries = { name: 'Heart Rate', series: [] as { name: Date, value: number }[] };
    const glucoseSeries = { name: 'Glucose', series: [] as { name: Date, value: number }[] };
    const tempSeries = { name: 'Temperature', series: [] as { name: Date, value: number }[] };

    sortedData.forEach(record => {
      const recordDate = new Date(record.record_time);
      if (record.blood_pressure_systolic !== null) bpSystolicSeries.series.push({ name: recordDate, value: record.blood_pressure_systolic });
      if (record.blood_pressure_diastolic !== null) bpDiastolicSeries.series.push({ name: recordDate, value: record.blood_pressure_diastolic });
      if (record.heart_rate !== null) hrSeries.series.push({ name: recordDate, value: record.heart_rate });
      if (record.glucose_level !== null) glucoseSeries.series.push({ name: recordDate, value: Number(record.glucose_level) });
      if (record.temperature !== null) tempSeries.series.push({ name: recordDate, value: Number(record.temperature) });
    });

    this.bpChartData = [bpSystolicSeries, bpDiastolicSeries].filter(s => s.series.length > 0);
    this.hrChartData = hrSeries.series.length > 0 ? [hrSeries] : [];
    this.glucoseChartData = glucoseSeries.series.length > 0 ? [glucoseSeries] : [];
    this.tempChartData = tempSeries.series.length > 0 ? [tempSeries] : [];
  }

   formatDate(dateString: string | null): string {
     if (!dateString) return 'N/A';
     return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
   }
}