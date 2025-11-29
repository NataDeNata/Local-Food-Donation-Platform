import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../../models/donation';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'admin-approvals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-approvals.component.html',
  styleUrls: ['./admin-approvals.component.css']
})
export class AdminApprovalsComponent implements OnInit {
  pendingDonations: Donation[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private donationService: DonationService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loading = true;
    this.donationService.listen(list => {
      this.pendingDonations = list.filter(d => d.status === 'pending');
      this.loading = false;
    });
  }

  async approve(d: Donation) {
    await this.donationService.setStatus(d.id!, 'available');
  }

  async reject(d: Donation) {
    await this.donationService.deleteDonation(d.id!);
  }
}
