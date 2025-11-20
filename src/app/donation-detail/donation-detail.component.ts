import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../../models/donation';

@Component({
  selector: 'donation-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './donation-detail.component.html',
  styleUrls: ['./donation-detail.component.css']
})
export class DonationDetailComponent implements OnInit, AfterViewInit {
  donation?: Donation;

  constructor(private svc: DonationService, private route: ActivatedRoute) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.donation = await this.svc.getById(id);
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
      if (!this.donation?.id) return; // bail if donation or id is missing
      const name = prompt('Enter your name to accept this donation:');
      if (name && name.trim().length > 0) {
        await this.svc.acceptDonation(this.donation.id, name.trim());
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
}