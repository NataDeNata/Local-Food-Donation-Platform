export type DonationStatus = 'available' | 'accepted' | 'completed' | 'pending';

export interface Donation {
  id?: string;
  title: string;
  description: string;
  quantity: number;
  location: string;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  status: DonationStatus;
  postedAt: string;
  acceptedBy?: string; // optional name of recipient
  acceptedByUid?: string; // optional UID of recipient (for per-user acceptance)
  contactName?: string;
  contactPhone?: string;
  userId?: string; // <-- add this line
  // ...any other properties...
}