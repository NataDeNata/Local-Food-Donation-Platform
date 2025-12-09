import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DonationService } from '../../services/donation.service';
import { Donation } from '../models/donation';

@Component({
  selector: 'recipient-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recipient-detail.component.html',
  styleUrls: ['./recipient-detail.component.css']
})
export class RecipientDetailComponent implements OnInit {
  recipientUid: string | null = null;
  donations: Donation[] = [];
  loading = true;

  constructor(
    private readonly svc: DonationService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.recipientUid = this.route.snapshot.paramMap.get('uid');
    this.svc.listen(list => {
      this.donations = list.filter(d => d.acceptedByUid === this.recipientUid);
      this.loading = false;
    });
  }
}
