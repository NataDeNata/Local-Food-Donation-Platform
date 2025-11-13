import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DonationService } from '../../services/donation.service';

@Component({
  selector: 'donation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-form.component.html',
  styleUrls: ['./donation-form.component.css']
})
export class DonationFormComponent {
  model = {
    title: '',
    description: '',
    quantity: 1,
    location: '',
    contactName: '',
    contactPhone: '',
  };

  constructor(private svc: DonationService, private router: Router) {}

  submit() {
    this.svc.addDonation(this.model);
    this.router.navigateByUrl('/');
  }

  reset() {
    this.model = { title: '', description: '', quantity: 1, location: '', contactName: '', contactPhone: '' };
  }
}