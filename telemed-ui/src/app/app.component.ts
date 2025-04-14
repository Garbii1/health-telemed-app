// app.component.ts
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { RouterOutlet } from '@angular/router'; // Import RouterOutlet
// ... other imports

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
     HeaderComponent, // <--- ADD
     FooterComponent, // <--- ADD
     RouterOutlet     // <--- ADD
  ],
  templateUrl: './app.component.html',
  // ...
})
export class AppComponent { /* ... */ }