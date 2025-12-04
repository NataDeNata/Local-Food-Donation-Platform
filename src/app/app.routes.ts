import { Routes } from '@angular/router';
import { DonationListComponent } from './donation-list/donation-list.component';
import { DonationFormComponent } from './donation-form/donation-form.component';
import { DonationDetailComponent } from './donation-detail/donation-detail.component';
import { LoginComponent } from './login/login.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminApprovalsComponent } from './admin-approvals/admin-approvals.component';
import { ChatListComponent } from './chat/chat-list.component';
import { ChatWindowComponent } from './chat/chat-window.component';
import { ChatNewComponent } from './chat/chat-new.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, title: 'Login' },
  { path: '', component: DonationListComponent, title: 'Donations' },
  { path: 'new', component: DonationFormComponent, title: 'Post Donation' },
  { path: 'donation/:id', component: DonationDetailComponent, title: 'Donation Detail' },
  { path: 'admin-dashboard', component: AdminDashboardComponent },
  { path: 'admin-approvals', component: AdminApprovalsComponent },
  { path: 'chat', component: ChatListComponent },
  { path: 'chat/new', component: ChatNewComponent },
  { path: 'chat/:id', component: ChatWindowComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'about', loadComponent: () => import('./about/about.component').then(m => m.AboutComponent) },
  { path: 'contact', loadComponent: () => import('./contact/contact.component').then(m => m.ContactComponent) },
  { path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
];