// ...existing code...

// ...existing code...

// ...existing code...
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Firestore, collection, getDocs, updateDoc, doc, deleteDoc } from '@angular/fire/firestore';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  pendingAdmin?: boolean;
  name?: string;
  barangay?: string;
  position?: string;
  contact?: string;
  pdfUrl?: string;
  photoUrls?: string[];
  roles?: { [key: string]: any }; // <-- Add this line
}

@Component({
  selector: 'admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  users: UserProfile[] = [];
  loading = false;
  error: string | null = null;
  selectedApplication: any = null;
  imageModalUrl: string | null = null;
  private refreshInterval: any;

  constructor(
    public authService: AuthService,
    private firestore: Firestore
  ) {}

  async ngOnInit() {
    // Only allow access if logged in as the super admin
    if (this.authService.user()?.email !== 'ynatz.ynatz@gmail.com') {
      this.error = 'Access denied. You are not authorized to view this page.';
      return;
    }
    this.loading = true;
    try {
      await this.loadUsers();
      // Poll for updates every 5 seconds
      this.refreshInterval = setInterval(() => {
        this.loadUsers();
      }, 5000);
    } catch (e: any) {
      this.error = e.message || 'Failed to load users';
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private async loadUsers() {
    const usersCol = collection(this.firestore, 'users');
    const snap = await getDocs(usersCol);
    this.users = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as any)
    }));
  }

  viewApplication(user: any) {
    // Show modal with application details
    this.selectedApplication = user;
  }

  closeModal() {
    this.selectedApplication = null;
  }

  openImageModal(url: string) {
    this.imageModalUrl = url;
  }

  closeImageModal() {
    this.imageModalUrl = null;
  }

  async approveAdmin(user: UserProfile) {
    if (!user.id) return;
    this.loading = true;
    try {
      await updateDoc(doc(this.firestore, 'users', user.id), {
        role: 'admin',
        pendingAdmin: false
      });
      await this.loadUsers(); // Refresh the user list
    } catch (e: any) {
      this.error = e.message || 'Failed to approve admin';
    } finally {
      this.loading = false;
    }
  }

  async removeAdmin(user: UserProfile) {
    if (!user.id) return;
    if (!confirm(`Are you sure you want to remove admin privilege from "${user.email}"?`)) return;
    this.loading = true;
    try {
      await updateDoc(doc(this.firestore, 'users', user.id), {
        role: 'user'
      });
      await this.loadUsers(); // Refresh the user list
    } catch (e: any) {
      this.error = e.message || 'Failed to remove admin privilege';
    } finally {
      this.loading = false;
    }
  }

  async removeUser(user: UserProfile) {
    if (!user.id) return;
    if (!confirm(`Are you sure you want to remove user or request for "${user.email}"?`)) return;
    this.loading = true;
    try {
      await deleteDoc(doc(this.firestore, 'users', user.id));
      this.users = this.users.filter(u => u.id !== user.id);
    } catch (e: any) {
      this.error = e.message || 'Failed to remove user or request';
    } finally {
      this.loading = false;
    }
  }
  
    async rejectAdmin(user: UserProfile) {
      if (!user.id) return;
      if (!confirm(`Are you sure you want to reject the admin application for "${user.email}"?`)) return;
      this.loading = true;
      try {
        await updateDoc(doc(this.firestore, 'users', user.id), {
          pendingAdmin: false,
          role: 'user'
        });
        await this.loadUsers();
      } catch (e: any) {
        this.error = e.message || 'Failed to reject admin application';
      } finally {
        this.loading = false;
      }
    }
}
