import { Component, OnInit } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../models/donation';

@Component({
  selector: 'post-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.css']
})
export class PostDetailComponent implements OnInit {
  donation?: Donation;
  zoomedPhoto: string | null = null;
  recipientEmail: string | null = null;

  constructor(
    private readonly svc: DonationService,
    private readonly route: ActivatedRoute,
    private readonly firestore: Firestore
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.donation = await this.svc.getById(id);
    if (this.donation?.acceptedByUid) {
      const userDoc = doc(this.firestore, 'users', this.donation.acceptedByUid);
      const snap = await getDoc(userDoc);
      if (snap.exists()) {
        this.recipientEmail = snap.data()['email'] || null;
      }
    }
  }
}
