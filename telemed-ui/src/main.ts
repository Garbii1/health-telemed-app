// telemed-ui/src/main.ts
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module'; // Import the main app module


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));