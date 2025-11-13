import { Routes } from '@angular/router';
import { DonationListComponent } from './donation-list/donation-list.component';
import { DonationFormComponent } from './donation-form/donation-form.component';
import { DonationDetailComponent } from './donation-detail/donation-detail.component';

export const routes: Routes = [
  { path: '', component: DonationListComponent, title: 'Donations' },
  { path: 'new', component: DonationFormComponent, title: 'Post Donation' },
  { path: 'donation/:id', component: DonationDetailComponent, title: 'Donation Detail' },
  { path: '**', redirectTo: '' },
];
