import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../../models/donation';

@Component({
  selector: 'donation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-form.component.html',
  styleUrls: ['./donation-form.component.css']
})
export class DonationFormComponent implements AfterViewInit {
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

  constructor(private svc: DonationService, private router: Router) {}

  ngAfterViewInit() {
    const map = new google.maps.Map(document.getElementById('map') as HTMLElement, {
      center: { lat: 16.4023, lng: 120.5960 },
      zoom: 13,
    });

    let marker: google.maps.Marker;

    const parseAddress = (
      components: google.maps.GeocoderAddressComponent[],
      formatted?: string,
      fallback?: string
    ) => {
      const street = components.find(c => c.types.includes('route'))?.long_name;
      const barangay =
        components.find(c => c.types.includes('sublocality_level_1'))?.long_name ||
        components.find(c => c.types.includes('sublocality_level_2'))?.long_name ||
        components.find(c => c.types.includes('neighborhood'))?.long_name;
      const city = components.find(c => c.types.includes('locality'))?.long_name;

      if (street && barangay && city) return `${street}, ${barangay}, ${city}`;
      if (barangay && city) return `${barangay}, ${city}`;
      return formatted || fallback || '';
    };

    // Handle map click
    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      this.model.latitude = event.latLng!.lat();
      this.model.longitude = event.latLng!.lng();

      if (marker) marker.setMap(null);
      marker = new google.maps.Marker({ position: event.latLng!, map });

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: event.latLng! }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const components = results[0].address_components;
          this.model.location = parseAddress(components, results[0].formatted_address);
        } else {
          this.model.location = `Pinned at (${this.model.latitude!.toFixed(5)}, ${this.model.longitude!.toFixed(5)})`;
        }
      });
    });

    // Autocomplete search box
    const input = document.getElementById('addressInput') as HTMLInputElement;
    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: 'ph' }
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const loc = place.geometry?.location;

      if (!loc) {
        console.warn('No geometry returned for place', place);
        return;
      }

      map.setCenter(loc);

      if (marker) marker.setMap(null);
      marker = new google.maps.Marker({ position: loc, map });

      this.model.latitude = loc.lat();
      this.model.longitude = loc.lng();

      if (place.address_components) {
        this.model.location = parseAddress(place.address_components, place.formatted_address, input.value);
      } else {
        this.model.location = place.formatted_address || input.value;
      }
    });
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

    // Clean up phone number
    this.model.contactPhone = this.model.contactPhone.replace(/\s|-/g, '');

    if (!this.model.location || this.model.location.trim().length === 0) {
      this.model.location = `Pinned at (${this.model.latitude!.toFixed(5)}, ${this.model.longitude!.toFixed(5)})`;
    }

    // Upload photos via DonationService
    const urls: string[] = [];
    for (const file of this.selectedFiles) {
      try {
        const downloadUrl = await this.svc.uploadPhoto(file);
        urls.push(downloadUrl);
      } catch (err: any) {
        console.error('Failed to upload file', file.name, err);
        throw err;
      }
    }
    this.model.photos = urls;

    // Save donation to Firestore
    await this.svc.addDonation(this.model);
    this.router.navigateByUrl('/');
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
  }
}