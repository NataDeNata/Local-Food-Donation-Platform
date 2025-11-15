import { Component, computed, AfterViewInit} from '@angular/core';
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
export class DonationDetailComponent {
  donation = computed<Donation | undefined>(() => {
    const id = this.route.snapshot.paramMap.get('id')!;
    return this.svc.getById(id);
  });

  constructor(private svc: DonationService, private route: ActivatedRoute) {}

  ngAfterViewInit(){
    const donation = this.donation();
    if (!donation) return;

    //default center if no coords
    const lat = donation.latitude || 16.4023;
    const lng = donation.longitude || 120.5960;

    const map = new google.maps.Map(document.getElementById('detailMap') as HTMLElement, {
      center: { lat, lng },
      zoom: 15,
    });

    new google.maps.Marker({
      position: { lat, lng },
      map,
      title: donation.location,
    });
  }

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

  openInGoogleMaps() {
    const donation = this.donation();
    if (!donation) return;

    if (donation.latitude && donation.longitude) {
      const url = `https://www.google.com/maps?q=${donation.latitude},${donation.longitude}`;
      window.open(url, '_blank');
    } else if (donation.location) {
      const query = encodeURIComponent(donation.location);
      const url = `https://www.google.com/maps/search/?q=${query}`;
      window.open(url, '_blank');
    }
  }

}