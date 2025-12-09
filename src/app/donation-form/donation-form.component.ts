import { Component, AfterViewInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../models/donation';
import { BARANGAYS } from '../models/barangays';
import { BARANGAY_CENTROIDS } from '../models/barangay-bounds';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'donation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-form.component.html',
  styleUrls: ['./donation-form.component.css']
})
export class DonationFormComponent implements AfterViewInit {
  // Live donations list
  donations = signal<Donation[]>([]);
  private unsubscribe?: () => void;

  // List of all donations for the selected barangay
  barangayDonations = () => {
    if (!this.selectedBarangayName) return [];
    return this.donations().filter(d => d.barangay === this.selectedBarangayName);
  };
  // Use the Donation type minus id/status/postedAt
  model: Omit<Donation, 'id' | 'status' | 'postedAt'> = {
    title: '',
    description: '',
    quantity: 1,
    location: '',
    contactName: '',
    contactPhone: '',
    latitude: 0,
    longitude: 0,
    photos: []
  };

  selectedFiles: File[] = [];
  posting = signal(false); // <-- add this signal
  selectedBarangayName: string = '';
  selectedBarangay: any = null;
  barangayWarning = signal('');

  // Use imported barangay list for dropdown
  barangayList = BARANGAYS;

  map: google.maps.Map | null = null;
  circle: google.maps.Circle | null = null;
  marker: google.maps.Marker | null = null;

  constructor(
    private svc: DonationService,
    private router: Router,
    private authService: AuthService // <-- inject AuthService
  ) {}

  ngOnInit() {
    this.unsubscribe = this.svc.listen(list => {
      this.donations.set(list);
    });

    // Restrict barangay selection for barangay admin only
    const getBarangayAdmin = () => {
      const firestoreUser = (this.authService as any).firestoreUser?.();
      if (firestoreUser && firestoreUser.barangayAdmin) {
        return String(firestoreUser.barangayAdmin).trim();
      }
      return null;
    };
    const barangayAdmin = getBarangayAdmin();
    // Only restrict barangay selection for admin role
    if (barangayAdmin && this.authService.userRole && this.authService.userRole() === 'admin') {
      this.barangayList = [barangayAdmin];
      this.selectedBarangayName = barangayAdmin;
      this.selectedBarangay = BARANGAY_CENTROIDS[barangayAdmin]
        ? { name: barangayAdmin, centroid: BARANGAY_CENTROIDS[barangayAdmin] }
        : null;
    } else {
      this.barangayList = BARANGAYS;
    }
  }

  ngOnDestroy() {
    this.unsubscribe?.();
  }

  ngAfterViewInit() {
    this.map = new google.maps.Map(document.getElementById('map') as HTMLElement, {
      center: { lat: 16.4023, lng: 120.5960 },
      zoom: 13,
    });

    // Draw circle if barangay is already selected
    if (this.selectedBarangay) {
      this.drawBarangayCircle();
    }

    // Remove autocomplete search box logic
  }

  drawBarangayCircle() {
    if (!this.map || !this.selectedBarangay) return;

    // Remove previous circle
    if (this.circle) {
      this.circle.setMap(null);
      this.circle = null;
    }

    // Draw new circle (e.g., 400m radius)
    this.circle = new google.maps.Circle({
      center: this.selectedBarangay.centroid,
      radius: 400, // meters
      map: this.map,
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.15,
      clickable: false
    });

    // Center map to barangay
    this.map.setCenter(this.selectedBarangay.centroid);
    this.map.setZoom(15);
  }

  onBarangayChange(select: HTMLSelectElement) {
    const barangayName = select.value;
    this.selectedBarangayName = barangayName;
    const centroid = BARANGAY_CENTROIDS[barangayName];
    this.selectedBarangay = centroid
      ? { name: barangayName, centroid }
      : null; // <-- set to null if no centroid
    this.barangayWarning.set('');

    if (centroid) {
      // Draw circle boundary around centroid
      this.drawBarangayCircle();
      // Remove marker if not at centroid
      if (this.marker) {
        const lat = this.marker.getPosition()!.lat();
        const lng = this.marker.getPosition()!.lng();
        if (lat !== centroid.lat || lng !== centroid.lng) {
          this.marker.setMap(null);
          this.marker = null;
          this.model.latitude = 0;
          this.model.longitude = 0;
          this.model.location = '';
        }
      }
    } else {
      // No centroid for this barangay, clear circle and marker, center map to default
      if (this.circle) {
        this.circle.setMap(null);
        this.circle = null;
      }
      if (this.marker) {
        this.marker.setMap(null);
        this.marker = null;
      }
      this.model.latitude = 0;
      this.model.longitude = 0;
      this.model.location = '';
      if (this.map) {
        this.map.setCenter({ lat: 16.4023, lng: 120.5960 });
        this.map.setZoom(13);
      }
    }
  }

  parseAddress(
    components: google.maps.GeocoderAddressComponent[],
    formatted?: string,
    fallback?: string
  ) {
    const street = components.find(c => c.types.includes('route'))?.long_name;
    const barangay =
      components.find(c => c.types.includes('sublocality_level_1'))?.long_name ||
      components.find(c => c.types.includes('sublocality_level_2'))?.long_name ||
      components.find(c => c.types.includes('neighborhood'))?.long_name;
    const city = components.find(c => c.types.includes('locality'))?.long_name;

    if (street && barangay && city) return `${street}, ${barangay}, ${city}`;
    if (barangay && city) return `${barangay}, ${city}`;
    return formatted || fallback || '';
  }

  // Handle file input
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  async submit(form: NgForm) {
    if (form.invalid) {
      return;
    }

    if (this.posting()) return; // Prevent double submit
    this.posting.set(true);
    try {
      // Clean up phone number
      if (this.model.contactPhone) {
        this.model.contactPhone = this.model.contactPhone.replace(/\s|-/g, '');
      }

      // Upload photos via DonationService
      const urls: string[] = [];
      for (const file of this.selectedFiles) {
        const downloadUrl = await this.svc.uploadPhoto(file);
        urls.push(downloadUrl);
      }
      this.model.photos = urls;

      // Assign barangay to the donation
      (this.model as any).barangay = this.selectedBarangayName;

      // Save donation to Firestore
      await this.svc.addDonation(this.model);

      // Reset form and navigate to home
      form.resetForm();
      this.reset();
      this.router.navigate(['/']);
    } finally {
      this.posting.set(false);
    }
  }

  reset() {
    this.model = {
      title: '',
      description: '',
      quantity: 1,
      location: '',
      contactName: '',
      contactPhone: '',
      latitude: 0,
      longitude: 0,
      photos: []
    };
    this.selectedFiles = [];
    this.selectedBarangayName = '';
    this.selectedBarangay = null;
    this.barangayWarning.set('');
    if (this.circle) this.circle.setMap(null);
    if (this.marker) this.marker.setMap(null);
    this.circle = null;
    this.marker = null;
  }
}