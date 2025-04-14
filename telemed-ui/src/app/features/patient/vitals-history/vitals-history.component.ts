import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Color, ScaleType } from '@swimlane/ngx-charts'; // Import necessary types

@Component({
  selector: 'app-vitals-history',
  templateUrl: './vitals-history.component.html',
  styleUrls: ['./vitals-history.component.scss']
})
export class VitalsHistoryComponent implements OnChanges {
  @Input() vitalsData: any[] | null = null;

  // Chart data arrays
  bpChartData: any[] = [];
  hrChartData: any[] = [];
  glucoseChartData: any[] = [];
  tempChartData: any[] = [];

  // Chart options (basic)
  view: [number, number] = [700, 300]; // Width, Height (adjust as needed)
  legend: boolean = true;
  showLabels: boolean = true;
  animations: boolean = true;
  xAxis: boolean = true;
  yAxis: boolean = true;
  showYAxisLabel: boolean = true;
  showXAxisLabel: boolean = true;
  xAxisLabel: string = 'Date';
  timeline: boolean = true; // Use timeline for x-axis dates

  // Define color schemes for charts
  colorSchemeBP: Color = { domain: ['#5AA454', '#E44D25'], group: ScaleType.Ordinal, selectable: true, name: 'BP' };
  colorSchemeHR: Color = { domain: ['#C7B42C'], group: ScaleType.Ordinal, selectable: true, name: 'HR' };
  colorSchemeGlucose: Color = { domain: ['#A10A28'], group: ScaleType.Ordinal, selectable: true, name: 'Glucose' };
  colorSchemeTemp: Color = { domain: ['#4a90e2'], group: ScaleType.Ordinal, selectable: true, name: 'Temp' };


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vitalsData'] && this.vitalsData) {
      console.log("Vitals data received in history component:", this.vitalsData);
      this.processChartData(this.vitalsData);
    }
  }

  private processChartData(data: any[]): void {
    // Sort data by record_time ascending for charts
     const sortedData = [...data].sort((a, b) => new Date(a.record_time).getTime() - new Date(b.record_time).getTime());

    // Reset chart data
    this.bpChartData = [];
    this.hrChartData = [];
    this.glucoseChartData = [];
    this.tempChartData = [];

    // Prepare data for ngx-charts (line chart format: array of objects with name and series)
    const bpSystolicSeries = { name: 'Systolic', series: [] as { name: Date, value: number }[] };
    const bpDiastolicSeries = { name: 'Diastolic', series: [] as { name: Date, value: number }[] };
    const hrSeries = { name: 'Heart Rate', series: [] as { name: Date, value: number }[] };
    const glucoseSeries = { name: 'Glucose', series: [] as { name: Date, value: number }[] };
    const tempSeries = { name: 'Temperature', series: [] as { name: Date, value: number }[] };

    sortedData.forEach(record => {
      const recordDate = new Date(record.record_time); // Use Date objects for x-axis

      if (record.blood_pressure_systolic !== null) {
        bpSystolicSeries.series.push({ name: recordDate, value: record.blood_pressure_systolic });
      }
      if (record.blood_pressure_diastolic !== null) {
        bpDiastolicSeries.series.push({ name: recordDate, value: record.blood_pressure_diastolic });
      }
      if (record.heart_rate !== null) {
        hrSeries.series.push({ name: recordDate, value: record.heart_rate });
      }
      if (record.glucose_level !== null) {
         // Convert decimal string to number if necessary
        glucoseSeries.series.push({ name: recordDate, value: Number(record.glucose_level) });
      }
      if (record.temperature !== null) {
         // Convert decimal string to number if necessary
        tempSeries.series.push({ name: recordDate, value: Number(record.temperature) });
      }
    });

    // Assign data to chart properties only if series have data
    if (bpSystolicSeries.series.length > 0 || bpDiastolicSeries.series.length > 0) {
        this.bpChartData = [bpSystolicSeries, bpDiastolicSeries].filter(s => s.series.length > 0);
    }
     if (hrSeries.series.length > 0) {
         this.hrChartData = [hrSeries];
     }
     if (glucoseSeries.series.length > 0) {
         this.glucoseChartData = [glucoseSeries];
     }
      if (tempSeries.series.length > 0) {
          this.tempChartData = [tempSeries];
      }

     console.log("Processed BP Chart Data:", this.bpChartData);
     console.log("Processed HR Chart Data:", this.hrChartData);
  }

   // Format date for display in the table
   formatDate(dateString: string): string {
     if (!dateString) return 'N/A';
     return new Date(dateString).toLocaleString(); // Use locale format
   }
}