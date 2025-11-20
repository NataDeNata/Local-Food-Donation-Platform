export type DonationStatus = 'available' | 'accepted' | 'completed';

export interface Donation {
  id?: string;
  title: string;
  description: string;
  quantity: number;
  location: string;
  contactName: string;
  contactPhone: string;
  status: DonationStatus;
  postedAt: string; // ISO date
  acceptedBy?: string; // optional name of recipient
  latitude?: number;
  longitude?: number;
  photos?: string[]; // array of image URLs or base64 strings
}