import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { GoogleMapsModule } from '@angular/google-maps';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../../models/donation';

@Component({
  selector: 'donation-list',
  standalone: true,
  imports: [CommonModule, RouterLink, GoogleMapsModule],
  templateUrl: './donation-list.component.html',
  styleUrls: ['./donation-list.component.css']
})
export class DonationListComponent implements OnInit {
  // Signal to hold all donations
  donations = signal<Donation[]>([]);

  // Filter signal
  filter = signal<'all' | 'available' | 'accepted' | 'completed'>('all');

  // Computed filtered list
  filtered = computed(() => {
    const f = this.filter();
    const list = this.donations();
    return f === 'all' ? list : list.filter(d => d.status === f);
  });

  center = { lat: 16.4023, lng: 120.5960 }; // Default center: Baguio City
  zoom = 13;

  constructor(private svc: DonationService, private router: Router) {}

  ngOnInit() {
    // Subscribe to Firestore updates
    this.svc.listen(list => {
      this.donations.set(list);

      // Recenter map on first donation with coords
      const first = list.find(d => d.latitude && d.longitude);
      if (first) {
        this.center = { lat: first.latitude!, lng: first.longitude! };
      }
    });
  }

  setFilter(f: 'all' | 'available' | 'accepted' | 'completed') {
    this.filter.set(f);
  }

  async quickAccept(d: Donation) {
    const name = prompt('Enter your name to accept this donation:');
    if (name && name.trim().length > 0) {
      await this.svc.acceptDonation(d.id!, name.trim());
    }
  }

  async complete(d: Donation) {
    if (confirm('Mark this donation as completed?')) {
      await this.svc.completeDonation(d.id!);
    }
  }

  // Build markers array for Google Maps
  get markers() {
    return this.filtered()
      .filter(d => d.latitude != null && d.longitude != null)
      .map(d => ({
        id: d.id,
        position: { lat: d.latitude!, lng: d.longitude! },
        label: { text: d.title, color: 'black' },
        options: { icon: this.getIcon(d.status) }
      }));
  }

  private getIcon(status: string) {
    switch (status) {
      case 'available': return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
      case 'accepted': return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
      case 'completed': return 'http://maps.google.com/mapfiles/ms/icons/grey-dot.png';
      default: return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
    }
  }

  goToDonation(id: string) {
    this.router.navigate(['/donation', id]);
  }

  async delete(d: Donation) {
    if (confirm(`Are you sure you want to delete "${d.title}"?`)) {
      await this.svc.deleteDonation(d.id!);
    }
  }
}