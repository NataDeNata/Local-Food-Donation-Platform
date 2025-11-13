import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../../models/donation';

@Component({
  selector: 'donation-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: 'donation-list.component.html',
  styleUrls: ['donation-list.component.css']
})
export class DonationListComponent {
  filter = signal<'all' | 'available' | 'accepted' | 'completed'>('all');
  filtered = computed(() => {
    const f = this.filter();
    const list = this.svc.donations();
    return f === 'all' ? list : list.filter(d => d.status === f);
  });

  constructor(private svc: DonationService) {}

  setFilter(f: 'all' | 'available' | 'accepted' | 'completed') { this.filter.set(f); }

  quickAccept(d: Donation) {
    const name = prompt('Enter your name to accept this donation:');
    if (name && name.trim().length > 0) {
      this.svc.acceptDonation(d.id, name.trim());
    }
  }

  complete(d: Donation) {
    if (confirm('Mark this donation as completed?')) {
      this.svc.completeDonation(d.id);
    }
  }
}