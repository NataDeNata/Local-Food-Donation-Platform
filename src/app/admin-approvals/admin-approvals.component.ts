import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DonationService } from '../../services/donation.service';
import { Donation, DonationStatus } from '../../models/donation';
import { RouterLink } from '@angular/router';

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

  constructor(private svc: DonationService) {
    this.svc.listen(list => {
      this.pendingDonations = list.filter(d => d.status === 'pending');
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
