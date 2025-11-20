import { Injectable } from '@angular/core';
import { Donation, DonationStatus } from '../models/donation';
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

@Injectable({ providedIn: 'root' })
export class DonationService {
  private donationsCol: CollectionReference;

  private storage = getStorage(); //use AngularFire helper

  constructor(private firestore: Firestore) {
    this.donationsCol = collection(this.firestore, 'donations');
  }

  // Real-time listener
  listen(callback: (donations: Donation[]) => void) {
    return onSnapshot(this.donationsCol, snapshot => {
      const list: Donation[] = snapshot.docs.map(d => {
        return {
          id: d.id,
          ...(d.data() as Omit<Donation, 'id'>)
        } as Donation;
      });
      callback(list);
    });
  }

  async addDonation(input: Omit<Donation, 'id' | 'status' | 'postedAt'>) {
    const donationData: Omit<Donation, 'id'> = {
      ...input,
      status: 'available',
      postedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(this.donationsCol, donationData);
    return { ...donationData, id: docRef.id } as Donation;
  }

  async getById(id: string): Promise<Donation | undefined> {
    const snap = await getDoc(doc(this.firestore, 'donations', id));
    return snap.exists()
      ? ({ id: snap.id, ...(snap.data() as Omit<Donation, 'id'>) } as Donation)
      : undefined;
  }

  async acceptDonation(id: string, acceptedBy: string) {
    await updateDoc(doc(this.firestore, 'donations', id), {
      status: 'accepted',
      acceptedBy
    });
  }

  async completeDonation(id: string) {
    await updateDoc(doc(this.firestore, 'donations', id), {
      status: 'completed'
    });
  }

  async setStatus(id: string, status: DonationStatus) {
    await updateDoc(doc(this.firestore, 'donations', id), { status });
  }

  async deleteDonation(id: string) {
    await deleteDoc(doc(this.firestore, 'donations', id));
  }

  // Safe photo upload using AngularFire Storage SDK
 async uploadPhotoViaFunction(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.downloadUrl;
}
}