  // ...existing code...
import { Injectable } from '@angular/core';
import { Donation, DonationStatus } from '../app/models/donation';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  CollectionReference
} from '@angular/fire/firestore';
import { onSnapshot } from '@angular/fire/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { AuthService } from './auth.service';

/**
 * Service for managing donation data, including CRUD operations and real-time updates.
 */
@Injectable({ providedIn: 'root' })
export class DonationService {
    /**
     * Updates donation fields for a given donation ID.
     * @param id Donation ID
     * @param update Partial donation fields to update
     */
    async updateDonation(id: string, update: Partial<Donation>) {
      await updateDoc(doc(this.firestore, 'donations', id), update);
    }
  private readonly donationsCol: CollectionReference;
  private readonly storage = getStorage(); //use AngularFire helper

  /**
   * Constructor injects Firestore and AuthService dependencies.
   * @param firestore AngularFire Firestore instance
   * @param authService AuthService for user authentication
   */
  constructor(
    private readonly firestore: Firestore,
    private readonly authService: AuthService
  ) {
    this.donationsCol = collection(this.firestore, 'donations');
  }

  /**
   * Sets up a real-time listener for donations collection.
   * @param callback Function to call with updated donation list
   * @returns Unsubscribe function
   */
  listen(callback: (donations: Donation[]) => void) {
    return onSnapshot(this.donationsCol, snapshot => {
      const list: Donation[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Donation, 'id'>)
      }) as Donation);
      callback(list);
    });
  }

  /**
   * Adds a new donation to the database.
   * @param input Donation data (without id, status, postedAt)
   * @returns The created Donation object
   */
  async addDonation(input: Omit<Donation, 'id' | 'status' | 'postedAt'>) {
    const role = this.authService.userRole();
    const user = this.authService.user();
    const donationData: Omit<Donation, 'id'> = {
      ...input,
      status: role === 'admin' ? 'available' : 'pending',
      postedAt: new Date().toISOString(),
      userId: user?.uid // <-- ensure userId is set
    };
    const docRef = await addDoc(this.donationsCol, donationData);
    return { ...donationData, id: docRef.id } as Donation;
  }

  /**
   * Retrieves a donation by its ID.
   * @param id Donation ID
   * @returns The Donation object or undefined if not found
   */
  async getById(id: string): Promise<Donation | undefined> {
    const snap = await getDoc(doc(this.firestore, 'donations', id));
    return snap.exists()
      ? ({ id: snap.id, ...(snap.data() as Omit<Donation, 'id'>) } as Donation)
      : undefined;
  }

  /**
   * Accepts a donation by updating its status and acceptedBy fields.
   * @param id Donation ID
   * @param acceptedBy Name of the user accepting the donation
   */
  async acceptDonation(id: string, acceptedBy: string) {
    // Instead of only setting acceptedByUid/acceptedBy, also set status to 'accepted' for this user
    const user = this.authService.user();
    if (!user) return;
    await updateDoc(doc(this.firestore, 'donations', id), {
      status: 'accepted', 
      acceptedByUid: user.uid,
      acceptedBy: acceptedBy
    });
  }

  /**
   * Marks a donation as completed.
   * @param id Donation ID
   */
  async completeDonation(id: string) {
    await updateDoc(doc(this.firestore, 'donations', id), {
      status: 'completed'
    });
  }

  /**
   * Sets the status of a donation.
   * @param id Donation ID
   * @param status New status value
   */
  async setStatus(id: string, status: DonationStatus) {
    await updateDoc(doc(this.firestore, 'donations', id), { status });
  }

  /**
   * Deletes a donation from the database.
   * @param id Donation ID
   */
  async deleteDonation(id: string) {
    await deleteDoc(doc(this.firestore, 'donations', id));
  }

  /**
   * Uploads a photo to Firebase Storage and returns its download URL.
   * @param file File to upload
   * @returns Download URL of the uploaded photo
   */
  async uploadPhoto(file: File): Promise<string> {
    const photoRef = ref(this.storage, `donations/${crypto.randomUUID()}-${file.name}`);
    await uploadBytes(photoRef, file);
    return await getDownloadURL(photoRef);
  }
}