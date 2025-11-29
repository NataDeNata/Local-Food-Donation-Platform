import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { GoogleMapsModule } from '@angular/google-maps';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../../models/donation';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'donation-list',
  standalone: true,
  imports: [CommonModule, RouterLink, GoogleMapsModule],
  templateUrl: './donation-list.component.html',
  styleUrls: ['./donation-list.component.css']
})
export class DonationListComponent implements OnInit, OnDestroy {
  readonly donations = signal<Donation[]>([]);
  readonly filter = signal<'all' | 'available' | 'accepted' | 'completed' | 'posted'>('all');
  readonly loading = signal(true);
  readonly postedDonations = signal<Donation[]>([]);
  // pendingDonations signal and logic can be removed if not used elsewhere

  readonly filtered = computed(() => {
    const f = this.filter();
    const list = this.donations();
    const isAdmin = this.authService.userRole() === 'admin';
    const isLoggedIn = !!this.authService.user();
    const user = this.authService.user();

    if (f === 'posted') {
      if (!user) return [];
      return list.filter(d => d.userId === user.uid);
    }

    return list.filter(d => {
      if (d.status === 'pending') {
        return isAdmin && isLoggedIn;
      }
      // Admins see all accepted/completed donations, users only see their own
      if (f === 'accepted' || f === 'completed') {
        if (isAdmin) {
          return d.status === f;
        }
        if (user && d.acceptedByUid === user.uid) {
          return d.status === f;
        }
        return false;
      }
      // For available, show if not accepted by anyone or acceptedByUid is not current user
      if (f === 'available') {
        return d.status === 'available' || (user && d.acceptedByUid !== user.uid);
      }
      return f === 'all' ? true : d.status === f;
    });
  });

  center = { lat: 16.4023, lng: 120.5960 }; // Default center: Baguio City
  zoom = 13;

  private unsubscribe?: () => void;

  constructor(
    private readonly svc: DonationService,
    private readonly router: Router,
    public readonly authService: AuthService
  ) {}

  ngOnInit() {
    this.loading.set(true);
    this.unsubscribe = this.svc.listen(list => {
      this.donations.set(list);
      this.loading.set(false);

      // Set posted donations for the current user
      const user = this.authService.user();
      if (user) {
        this.postedDonations.set(list.filter(d => d.userId === user.uid));
      } else {
        this.postedDonations.set([]);
      }

      // Recenter map on first donation with coords
      const first = list.find(d => d.latitude && d.longitude);
      if (first) {
        this.center = { lat: first.latitude!, lng: first.longitude! };
      }
    });
  }

  ngOnDestroy() {
    // Clean up listener to prevent memory leaks
    this.unsubscribe?.();
  }

  // For template use
  setFilter(f: 'all' | 'available' | 'accepted' | 'completed' | 'posted') {
    this.filter.set(f);
  }

  async quickAccept(d: Donation) {
    if (!this.authService.user()) {
      this.router.navigate(['/login']);
      return;
    }
    // Use logged-in user's displayName or email as the acceptedBy name
    const user = this.authService.user();
    const name = user?.displayName || user?.email || 'Anonymous';
    await this.svc.acceptDonation(d.id!, name);
    // Optionally, update the local list to reflect the change immediately
    // (the real-time listener will also update it)
  }

  async complete(d: Donation) {
    if (confirm('Mark this donation as completed?')) {
      await this.svc.completeDonation(d.id!);
    }
  }

  async approve(d: Donation) {
    await this.svc.setStatus(d.id!, 'available');
  }

  // Build markers array for Google Maps
  get markers() {
    return this.filtered()
      .filter(d => d.latitude != null && d.longitude != null)
      .map(d => ({
        id: d.id,
        position: { lat: d.latitude!, lng: d.longitude! },
        label: {
          text: d.title,
          color: 'black',
          fontWeight: 'bold',
          fontSize: '14px',
          className: 'marker-label-bg'
        },
        options: { icon: this.getIcon(d.status) }
      }));
  }

  trackById(index: number, item: Donation) {
    return item.id;
  }

  private getIcon(status: string) {
    // Use SVG data URLs for reliable Google Maps marker icons
    switch (status) {
      case 'available':
        // Green circle pin
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%2306d6a0" stroke="black" stroke-width="1.5"/><circle cx="20" cy="20" r="8" fill="white"/></svg>';
      case 'accepted':
        // Yellow circle pin
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%23ffd166" stroke="black" stroke-width="1.5"/><circle cx="20" cy="20" r="8" fill="white"/></svg>';
      case 'completed':
        // Gray circle pin
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%23adb5bd" stroke="black" stroke-width="1.5"/><circle cx="20" cy="20" r="8" fill="white"/></svg>';
      default:
        // Red circle pin
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%23ef476f" stroke="black" stroke-width="1.5"/><circle cx="20" cy="20" r="8" fill="white"/></svg>';
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