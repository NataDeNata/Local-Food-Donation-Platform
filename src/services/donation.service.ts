import { Injectable, signal } from '@angular/core';
import { Donation, DonationStatus } from '../models/donation';

const STORAGE_KEY = 'donations';

@Injectable({ providedIn: 'root' })
export class DonationService {
  private _donations = signal<Donation[]>(this.load());
  readonly donations = this._donations.asReadonly();

  private load(): Donation[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as Donation[] : this.seed();
    } catch {
      return this.seed();
    }
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._donations()));
  }

  private seed(): Donation[] {
    return [
      {
        id: crypto.randomUUID(),
        title: 'Fresh vegetables',
        description: 'Assorted leafy greens and tomatoes from today.',
        quantity: 10,
        location: 'Baguio City Public Market',
        contactName: 'Ate Joy',
        contactPhone: '0917-000-0000',
        status: 'available',
        postedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        title: 'Bread loaves',
        description: 'Day-old bread, still good. Pick-up only.',
        quantity: 20,
        location: 'Session Road',
        contactName: 'Kuya Mark',
        contactPhone: '0918-111-1111',
        status: 'accepted',
        postedAt: new Date().toISOString(),
        acceptedBy: 'Community Pantry',
      },
    ];
  }

  getById(id: string): Donation | undefined {
    return this._donations().find(d => d.id === id);
  }

  addDonation(input: Omit<Donation, 'id' | 'status' | 'postedAt'>) {
    const donation: Donation = {
      id: crypto.randomUUID(),
      status: 'available',
      postedAt: new Date().toISOString(),
      ...input,
    };
    this._donations.update(list => [donation, ...list]);
    this.persist();
    return donation;
  }

  acceptDonation(id: string, acceptedBy: string) {
    this._donations.update(list =>
      list.map(d => d.id === id ? { ...d, status: 'accepted', acceptedBy } : d)
    );
    this.persist();
  }

  completeDonation(id: string) {
    this._donations.update(list =>
      list.map(d => d.id === id ? { ...d, status: 'completed' } : d)
    );
    this.persist();
  }

  setStatus(id: string, status: DonationStatus) {
    this._donations.update(list =>
      list.map(d => d.id === id ? { ...d, status } : d)
    );
    this.persist();
  }
}