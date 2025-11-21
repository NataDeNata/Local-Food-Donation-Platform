import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { environment } from './environments/environment';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideFirebaseApp(() => {
      if (!environment.firebase?.storageBucket) {
        throw new Error('Missing storageBucket in environment.firebase config');
      }
      return initializeApp(environment.firebase);
    }),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage())
  ]
});