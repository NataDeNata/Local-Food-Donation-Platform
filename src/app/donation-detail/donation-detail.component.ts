import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../../models/donation';

@Component({
  selector: 'donation-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: 'donation-detail.component.html',
  styleUrls: [`./donation-detail.component.css`]
})
export class DonationDetailComponent {
  donation = computed<Donation | undefined>(() => {
    const id = this.route.snapshot.paramMap.get('id')!;
    return this.svc.getById(id);
  });

  constructor(private svc: DonationService, private route: ActivatedRoute) {}

  accept() {
    const name = prompt('Enter your name to accept this donation:');
    if (name && name.trim().length > 0) {
      this.svc.acceptDonation(this.donation()!.id, name.trim());
    }
  }

  complete() {
    if (confirm('Mark this donation as completed?')) {
      this.svc.completeDonation(this.donation()!.id);
    }
  }
}