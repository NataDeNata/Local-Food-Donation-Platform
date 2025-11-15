import { Component, computed, signal } from '@angular/core';
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
export class DonationListComponent {
  filter = signal<'all' | 'available' | 'accepted' | 'completed'>('all');
  filtered = computed(() => {
    const f = this.filter();
    const list = this.svc.donations();
    return f === 'all' ? list : list.filter(d => d.status === f);
  });

  center = { lat: 16.4023, lng: 120.5960 }; // Default center: Baguio City
  zoom = 13;

  constructor(private svc: DonationService, private router: Router) {}

  setFilter(f: 'all' | 'available' | 'accepted' | 'completed') {
    this.filter.set(f);
  }

  ngOnInit() {
  const first = this.svc.donations().find(d => d.latitude && d.longitude);
  if (first) {
    this.center = { lat: first.latitude!, lng: first.longitude! };
  }
}


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

  // Build markers array for Google Maps
 get markers() {
  return this.filtered()
    .filter(d => d.latitude && d.longitude)
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

  // Navigate when marker clicked
  goToDonation(id: string) {
    this.router.navigate(['/donation', id]);
  }

  delete(d: Donation) {
  if (confirm(`Are you sure you want to delete "${d.title}"?`)) {
    this.svc.deleteDonation(d.id);
  }
}

}