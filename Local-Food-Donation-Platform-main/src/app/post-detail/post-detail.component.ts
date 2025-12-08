import { Component, OnInit } from '@angular/core';
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

  constructor(
    private readonly svc: DonationService,
    private readonly route: ActivatedRoute
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.donation = await this.svc.getById(id);
  }
}
