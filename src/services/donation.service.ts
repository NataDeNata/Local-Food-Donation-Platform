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

  // No example donations — start with an empty list
  private seed(): Donation[] {
    return [];
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

  deleteDonation(id: string) {
  this._donations.update(list => list.filter(d => d.id !== id));
  this.persist();
}

}