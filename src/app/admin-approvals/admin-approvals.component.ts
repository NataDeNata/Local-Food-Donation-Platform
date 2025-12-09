import { Component, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DonationService } from '../../services/donation.service';
import { Donation, DonationStatus } from '../models/donation';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'admin-approvals',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-approvals.component.html',
  styleUrls: ['./admin-approvals.component.css']
})
export class AdminApprovalsComponent {
  pendingDonations: Donation[] = [];
  loading = true;
  barangayAdmin: string = '';

  constructor(
    private svc: DonationService,
    public auth: AuthService // <-- make public for template debug
  ) {
    // Always set barangayAdmin directly from Firestore user record

    this.svc.listen(list => {
      const firestoreUser = this.auth.firestoreUser();
      this.barangayAdmin = firestoreUser && firestoreUser.roles && firestoreUser.roles.barangayAdmin
        ? String(firestoreUser.roles.barangayAdmin)
        : '';
      if (this.barangayAdmin) {
        const normalizedAdminBarangay = this.barangayAdmin.trim().toLowerCase();
        this.pendingDonations = list.filter(
          d =>
            d.status === 'pending' &&
            typeof d.barangay === 'string' &&
            !!d.barangay &&
            d.barangay.trim().toLowerCase() === normalizedAdminBarangay
        );
      } else {
        this.pendingDonations = list.filter(d => d.status === 'pending');
      }
      this.loading = false;
    });
  }

  async approve(d: Donation) {
    await this.svc.setStatus(d.id!, 'available');
  }

  async reject(d: Donation) {
    await this.svc.setStatus(d.id!, 'rejected' as DonationStatus);
  }
}
