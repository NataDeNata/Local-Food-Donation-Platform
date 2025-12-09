import { Component, computed, signal, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GoogleMapsModule } from '@angular/google-maps';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../models/donation';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { BARANGAYS } from '../models/barangays';
import { BARANGAY_CENTROIDS } from '../models/barangay-bounds';

/**
 * Component for displaying and managing the list of donations.
 * Handles filtering, pagination, Google Maps integration, and user actions.
 */
@Component({
  selector: 'donation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GoogleMapsModule],
  templateUrl: './donation-list.component.html',
  styleUrls: ['./donation-list.component.css']
})
export class DonationListComponent implements OnInit, OnDestroy {
      /**
       * Save the edited donation (stub implementation)
       */
      saveEdit() {
        // TODO: Implement save logic for editing a donation
        this.editMode = false;
        this.editDonation = {};
      }
    // Map of barangay names to centroid coordinates
    public barangayCoords: Record<string, { lat: number; lng: number }> = BARANGAY_CENTROIDS;
    public markers: any[] = [];

    onBarangayChange() {
      if (this.selectedBarangay) {
        const coords = this.barangayCoords[this.selectedBarangay];
        if (coords) {
          this.center = { lat: coords.lat, lng: coords.lng };
          this.zoom = 16;
        }
      }
    }

    clearBarangay() {
      this.selectedBarangay = null;
    }
  // Signals and state
  donations = signal<Donation[]>([]);
  loading = signal(false);
  postedDonations = signal<Donation[]>([]);
  filter = signal<'all' | 'available' | 'accepted' | 'completed' | 'posted' | 'fresh' | 'nearlyExpired'>('all');

  // Update setFilter to accept new types
  editMode = false;
  editDonation: Partial<Donation> = {};

  // Filtered donations based on current filter and barangay
  filtered = computed(() => {
    const f = this.filter();
    const user = this.authService.user();
    const isAdmin = this.authService.isAdmin();
    return this.donations().filter(d => {
      // Filter by selected barangay if set
      if (this.selectedBarangay && d.barangay !== this.selectedBarangay) return false;

      // Filter by food freshness
      if (f === 'fresh') return d.freshness === 'fresh';
      if (f === 'nearlyExpired') return d.freshness === 'nearlyExpired';

      // Remove pending and rejected posts for plain users
      if (!isAdmin) {
        if (d.status === 'pending') {
          // Plain users should not see these
          // Exception: allow user to see their own posted donations if filter is 'posted'
          if (!(f === 'posted' && user && d.userId === user.uid)) {
            return false;
          }
        }
      }

      // 'posted' filter: show only donations posted by current user
      if (f === 'posted') {
        return user && d.userId === user.uid;
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

  selectedBarangay: string | null = null;
  barangayDonations = computed(() => {
    if (!this.selectedBarangay) return [];
    return this.donations().filter(d => d.barangay === this.selectedBarangay);
  });
  barangays = BARANGAYS;

  /**
   * Center coordinates for Google Maps (default: Baguio City).
   */
  center = { lat: 16.4023, lng: 120.5960 };
  /**
   * Zoom level for Google Maps.
   */
  zoom = 13;

  private unsubscribe?: () => void;
  private intervalId?: any;
  undoTimeoutId?: any;
  lastAcceptedDonation?: Donation;
  showUndoPopup = signal(false);

  page = signal(1);
  pageSize = 12;

  readonly pagedFiltered = computed(() => {
    const all = this.filtered();
    const start = (this.page() - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });

  get totalPages() {
    return Math.ceil(this.filtered().length / this.pageSize);
  }

  /**
   * Constructor injects required services.
   * @param svc DonationService for data operations
   * @param router Router for navigation
   * @param authService AuthService for user authentication
   * @param chatService ChatService for chat operations
   */
  constructor(
    private readonly svc: DonationService,
    private readonly router: Router,
    public readonly authService: AuthService,
    private readonly chatService: ChatService
  ) {}

  /**
   * Lifecycle hook: Initializes the component, sets up listeners, and fetches donations.
   */
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

      // Update markers based on donation presence
      this.markers = Object.entries(this.barangayCoords).map(([name, coords]) => {
        const hasDonation = list.some(d => d.barangay === name);
        return {
          id: name,
          position: coords,
          label: {
            text: name,
            color: 'black',
            fontWeight: 'bold',
            fontSize: '14px',
            className: 'marker-label-bg'
          },
          options: { icon: this.getIcon(hasDonation ? 'available' : 'none') }
        };
      });
    });

    // Initialize markers once to prevent blinking
    this.markers = Object.entries(this.barangayCoords).map(([name, coords]) => ({
      id: name,
      position: coords,
      label: {
        text: name,
        color: 'black',
        fontWeight: 'bold',
        fontSize: '14px',
        className: 'marker-label-bg'
      },
      options: { icon: this.getIcon('available') }
    }));

    // Example: If you ever use setInterval or setTimeout, store and clear them in ngOnDestroy
    // this.intervalId = setInterval(() => { ... }, 10000);
  }

  /**
   * Lifecycle hook: Cleans up listeners and intervals to prevent memory leaks.
   */
  ngOnDestroy() {
    // Clean up listener to prevent memory leaks
    this.unsubscribe?.();
    // If you ever use setInterval/setTimeout, clear them here
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.undoTimeoutId) {
      clearTimeout(this.undoTimeoutId);
    }
  }

  // For template use
  /**
   * Start editing the user's own donation
   * @param d Donation to edit
   */
  startEdit(d: Donation) {
    this.editMode = true;
    // Shallow copy to avoid mutating the original
    this.editDonation = { ...d };
  }

  /**
   * Cancel editing and reset form
   */
  cancelEdit() {
    this.editMode = false;
    this.editDonation = {};
  }
  /**
   * Sets the current filter for the donation list.
   * @param f Filter value
   */
  setFilter(f: 'all' | 'available' | 'accepted' | 'completed' | 'posted' | 'fresh' | 'nearlyExpired') {
    this.filter.set(f);
  }

  /**
   * Quickly accept a donation and show undo popup.
   * @param d Donation to accept
   */
  async quickAccept(d: Donation) {
    const user = this.authService.user();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    // Type assertion to allow access to 'roles'
    const barangayAdmin = (user as any)?.roles?.['barangayAdmin'];
    if (barangayAdmin && d.barangay !== barangayAdmin) {
      alert('You can only accept donations for your assigned barangay.');
      return;
    }
    const name = user?.displayName || user?.email || 'Anonymous';

    // Store for undo
    this.lastAcceptedDonation = { ...d };
    await this.svc.acceptDonation(d.id!, name);

    // Show undo popup for 5 seconds
    this.showUndoPopup.set(true);
    if (this.undoTimeoutId) clearTimeout(this.undoTimeoutId);
    this.undoTimeoutId = setTimeout(() => {
      this.showUndoPopup.set(false);
      this.lastAcceptedDonation = undefined;
    }, 5000);
  }

  /**
   * Undo the last accepted donation if possible.
   */
  async undoAccept() {
    if (this.lastAcceptedDonation) {
      // Set status back to 'available'
      await this.svc.setStatus(this.lastAcceptedDonation.id!, 'available');
      this.showUndoPopup.set(false);
      this.lastAcceptedDonation = undefined;
      if (this.undoTimeoutId) clearTimeout(this.undoTimeoutId);
    }
  }

  /**
   * Mark a donation as completed after confirmation.
   * @param d Donation to complete
   */
  async complete(d: Donation) {
    if (confirm('Mark this donation as completed?')) {
      await this.svc.completeDonation(d.id!);
    }
  }

  /**
   * Delete a donation after confirmation.
   * @param d Donation to delete
   */
  async delete(d: Donation) {
    const user = this.authService.user();
    // Allow admin to delete any post, users only their own
    if ((this.authService.isAdmin() || (user && d.userId === user.uid))) {
      if (confirm(`Are you sure you want to delete "${d.title}"?`)) {
        await this.svc.deleteDonation(d.id!);
      }
    } else {
      alert('You can only delete your own donation posts.');
    }
  }

  /**
   * Approve a pending donation and set its status to available.
   * @param d Donation to approve
   */
  async approve(d: Donation) {
    await this.svc.setStatus(d.id!, 'available');
  }

  // Removed markers getter; now using property

  /**
   * Returns a Google Maps marker icon SVG data URL based on donation status.
   * @param status Donation status
   */
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
      case 'none':
        // Red circle pin for barangay with no donations
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%23ef476f" stroke="black" stroke-width="1.5"/><circle cx="20" cy="20" r="8" fill="white"/></svg>';
      default:
        // Red circle pin
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%23ef476f" stroke="black" stroke-width="1.5"/><circle cx="20" cy="20" r="8" fill="white"/></svg>';
    }
  }

  /**
   * Navigate to the donation detail page.
   * @param id Donation ID
   */
  goToDonation(id: string) {
    this.router.navigate(['/donation', id]);
  }

  /**
   * Start a chat with the donator if not the current user.
   * @param donatorUid Donator's user ID
   */
  startChatWithDonator(donatorUid: string) {
    const currentUser = this.authService.user();
    if (!currentUser || !donatorUid || currentUser.uid === donatorUid) return;
    this.chatService.createChat([currentUser.uid, donatorUid]).then(chatId => {
      this.router.navigate(['/chat', chatId]);
    });
  }

  /**
   * Set the current page for pagination.
   * @param p Page number
   */
  setPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.page.set(p);
    }
  }

  @ViewChild('barangayTable') barangayTableRef?: ElementRef;

  onMarkerClick(barangay: string) {
    const donation = this.donations().find(d => d.barangay === barangay);
    if (donation && donation.id) {
      this.router.navigate(['/donation', donation.id]);
    } else {
      alert('No donations found for this barangay.');
    }
  }

  goToRecipient(uid: string) {
    this.router.navigate(['/recipient', uid]);
  }
}