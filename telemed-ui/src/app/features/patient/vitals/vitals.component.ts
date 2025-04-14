// vitals.component.ts
import { CommonModule } from '@angular/common'; // For *ngIf
import { VitalsFormComponent } from '../vitals-form/vitals-form.component';
import { VitalsHistoryComponent } from '../vitals-history/vitals-history.component';
// ... other imports

@Component({
   selector: 'app-patient-vitals',
   standalone: true,
   imports: [
       CommonModule,           // <--- ADD for *ngIf
       VitalsFormComponent,    // <--- ADD
       VitalsHistoryComponent  // <--- ADD
   ],
   templateUrl: './vitals.component.html',
   // ...
})
export class PatientVitalsComponent implements OnInit { /* ... */ }