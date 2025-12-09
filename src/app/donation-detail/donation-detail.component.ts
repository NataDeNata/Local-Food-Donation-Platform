import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../models/donation';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'donation-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './donation-detail.component.html',
  styleUrls: ['./donation-detail.component.css']
})
export class DonationDetailComponent implements OnInit, AfterViewInit {
      async acceptDonation(d: Donation) {
        if (!d.id) return;
        const name = prompt('Enter your name to accept this donation:');
        if (name && name.trim().length > 0) {
          await this.svc.acceptDonation(d.id, name.trim());
          // Redirect to post detail after accepting
          this.router.navigate(['/post', d.id]);
        }
      }
    donations: Donation[] = [];
    barangayDonations: Donation[] = [];
  editMode = false;
  editDonation: Partial<Donation> = {};
    startEdit() {
      if (!this.donation) return;
      this.editMode = true;
      this.editDonation = { ...this.donation };
      setTimeout(() => this.initEditMap(), 300);
    }

    cancelEdit() {
      this.editMode = false;
      this.editDonation = {};
    }

    async saveEdit() {
      if (!this.donation?.id) return;
      const update: Partial<Donation> = {
        title: this.editDonation.title,
        description: this.editDonation.description,
        quantity: this.editDonation.quantity,
        location: this.editDonation.location,
        latitude: this.editDonation.latitude,
        longitude: this.editDonation.longitude
      };
      await this.svc.updateDonation(this.donation.id, update);
      this.editMode = false;
      this.editDonation = {};
      window.location.reload();
    }

    initEditMap() {
      const lat = this.editDonation.latitude || 16.4023;
      const lng = this.editDonation.longitude || 120.5960;
      const map = new google.maps.Map(document.getElementById('editMap') as HTMLElement, {
        center: { lat, lng },
        zoom: 15,
      });
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        draggable: true,
        title: this.editDonation.location || '',
      });
      marker.addListener('dragend', (event: any) => {
        this.editDonation.latitude = event.latLng.lat();
        this.editDonation.longitude = event.latLng.lng();
      });
      map.addListener('click', (event: any) => {
        marker.setPosition(event.latLng);
        this.editDonation.latitude = event.latLng.lat();
        this.editDonation.longitude = event.latLng.lng();
      });
    }
  donation?: Donation;
  zoomedPhoto: string | null = null;
  highlightedDonationId: string | null = null;

  constructor(
    private readonly svc: DonationService,
    private readonly route: ActivatedRoute,
    public readonly authService: AuthService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.donation = await this.svc.getById(id);

    // Get highlight id from query param (e.g., ?highlight=donationId)
    this.route.queryParamMap.subscribe(params => {
      this.highlightedDonationId = params.get('highlight');
      // Scroll to highlighted row if present
      setTimeout(() => {
        if (this.highlightedDonationId) {
          const row = document.getElementById('donation-row-' + this.highlightedDonationId);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 200);
    });

    // Listen for all donations and filter for barangay
    this.svc.listen(list => {
      this.donations = list;
      if (this.donation?.barangay) {
        // Only show posted donations (status 'available')
        this.barangayDonations = list.filter(
          d => d.barangay === this.donation!.barangay && d.status === 'available'
        );
      } else {
        this.barangayDonations = [];
      }
    });
  }

  ngAfterViewInit() {
    // Wait until donation is loaded
    setTimeout(() => {
      if (!this.donation) return;

      const lat = this.donation.latitude || 16.4023;
      const lng = this.donation.longitude || 120.5960;

      const map = new google.maps.Map(document.getElementById('detailMap') as HTMLElement, {
        center: { lat, lng },
        zoom: 15,
      });

      new google.maps.Marker({
        position: { lat, lng },
        map,
        title: this.donation.location,
      });
    }, 500); // small delay to ensure donation is fetched
  }

  async accept() {
    if (!this.donation?.id) return;
    // For admin, auto-approve without prompt
    if (this.authService.userRole() === 'admin') {
      await this.svc.setStatus(this.donation.id, 'available');
      window.location.reload();
      return;
    }
    const name = prompt('Enter your name to accept this donation:');
    if (name && name.trim().length > 0) {
      await this.svc.acceptDonation(this.donation.id, name.trim());
    }
  }

  async delete() {
    if (!this.donation?.id) return;
    if (confirm(`Are you sure you want to delete "${this.donation.title}"?`)) {
      await this.svc.deleteDonation(this.donation.id);
      this.router.navigate(['/']);
    }
  }

  async complete() {
    if (!this.donation?.id) return;
    if (confirm('Mark this donation as completed?')) {
      await this.svc.completeDonation(this.donation.id);
    }
  }

  openInGoogleMaps() {
    if (!this.donation) return;

    if (this.donation.latitude && this.donation.longitude) {
      const url = `https://www.google.com/maps?q=${this.donation.latitude},${this.donation.longitude}`;
      window.open(url, '_blank');
    } else if (this.donation.location) {
      const query = encodeURIComponent(this.donation.location);
      const url = `https://www.google.com/maps/search/?q=${query}`;
      window.open(url, '_blank');
    }
  }

  startChatWithDonator() {
    if (!this.donation?.userId || !this.authService.user()) return;
    const currentUser = this.authService.user();
    if (!currentUser || !currentUser.uid || !this.donation.userId) return;
    if (currentUser.uid === this.donation.userId) return;
    import('../../services/chat.service').then(({ ChatService }) => {
      const chatService = new ChatService(this['svc']['firestore']);
      chatService.createChat([currentUser.uid, this.donation!.userId as string]).then(chatId => {
        this.router.navigate(['/chat', chatId]);
      });
    });
  }

  zoomPhoto(photo: string) {
    // Defensive: ensure photo is a string and not null/undefined
    if (photo) {
      this.zoomedPhoto = photo;
    }
  }
}