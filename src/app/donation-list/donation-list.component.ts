import { Component, computed, signal, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GoogleMapsModule } from '@angular/google-maps';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../../models/donation';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';

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
   * Edit mode state for user's own donation
   */
  editMode = false;
  /**
   * Editable donation object for the form
   */
  editDonation: Partial<Donation> = {};
  /**
   * List of all donations fetched from the service.
   */
  readonly donations = signal<Donation[]>([]);
  /**
   * Current filter for the donation list.
   */
  readonly filter = signal<'all' | 'available' | 'accepted' | 'completed' | 'posted'>('all');
  /**
   * Loading state for the donation list.
   */
  readonly loading = signal(true);
  /**
   * Donations posted by the current user.
   */
  readonly postedDonations = signal<Donation[]>([]);
  // pendingDonations signal and logic can be removed if not used elsewhere

  /**
   * Filtered list of donations based on the current filter and user role.
   */
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
    });

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
   * Save the edited donation and update in backend
   */
  async saveEdit() {
    if (!this.editDonation.id) return;
    // Only allow editing certain fields
    const update: Partial<Donation> = {
      title: this.editDonation.title,
      description: this.editDonation.description,
      quantity: this.editDonation.quantity,
      location: this.editDonation.location
    };
    await this.svc.updateDonation(this.editDonation.id, update);
    this.editMode = false;
    this.editDonation = {};
  }
  /**
   * Sets the current filter for the donation list.
   * @param f Filter value
   */
  setFilter(f: 'all' | 'available' | 'accepted' | 'completed' | 'posted') {
    this.filter.set(f);
  }

  /**
   * Quickly accept a donation and show undo popup.
   * @param d Donation to accept
   */
  async quickAccept(d: Donation) {
    if (!this.authService.user()) {
      this.router.navigate(['/login']);
      return;
    }
    const user = this.authService.user();
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
    if (confirm(`Are you sure you want to delete "${d.title}"?`)) {
      await this.svc.deleteDonation(d.id!);
    }
  }

  /**
   * Approve a pending donation and set its status to available.
   * @param d Donation to approve
   */
  async approve(d: Donation) {
    await this.svc.setStatus(d.id!, 'available');
  }

  private _markers: any[] = [];
  private lastMarkersSource: string = '';

  // Build markers array for Google Maps
  /**
   * Build markers array for Google Maps based on filtered donations.
   */
  get markers() {
    // Use a stable key to detect if filtered donations changed
    const source = JSON.stringify(this.filtered().map(d => ({
      id: d.id, lat: d.latitude, lng: d.longitude, status: d.status, title: d.title
    })));
    if (source !== this.lastMarkersSource) {
      this._markers = this.filtered()
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
      this.lastMarkersSource = source;
    }
    return this._markers;
  }

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
}