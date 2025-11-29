import { Routes } from '@angular/router';
import { DonationListComponent } from './donation-list/donation-list.component';
import { DonationFormComponent } from './donation-form/donation-form.component';
import { DonationDetailComponent } from './donation-detail/donation-detail.component';
import { LoginComponent } from './login/login.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminApprovalsComponent } from './admin-approvals/admin-approvals.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, title: 'Login' },
  { path: '', component: DonationListComponent, title: 'Donations' },
  { path: 'new', component: DonationFormComponent, title: 'Post Donation' },
  { path: 'donation/:id', component: DonationDetailComponent, title: 'Donation Detail' },
  { path: 'admin-dashboard', component: AdminDashboardComponent },
  { path: 'admin-approvals', component: AdminApprovalsComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];