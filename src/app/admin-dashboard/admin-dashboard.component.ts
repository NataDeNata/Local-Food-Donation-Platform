import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Firestore, collection, getDocs, updateDoc, doc, deleteDoc } from '@angular/fire/firestore';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  pendingAdmin?: boolean;
}

@Component({
  selector: 'admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  users: UserProfile[] = [];
  loading = false;
  error: string | null = null;

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
    } catch (e: any) {
      this.error = e.message || 'Failed to load users';
    } finally {
      this.loading = false;
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

  async approveAdmin(user: UserProfile) {
    if (!user.id) return;
    this.loading = true;
    try {
      await updateDoc(doc(this.firestore, 'users', user.id), {
        role: 'admin',
        pendingAdmin: false
      });
      user.role = 'admin';
      user.pendingAdmin = false;
    } catch (e: any) {
      this.error = e.message || 'Failed to approve admin';
    } finally {
      this.loading = false;
    }
  }

  async removeUser(user: UserProfile) {
    if (!user.id) return;
    if (!confirm(`Are you sure you want to remove user "${user.email}"?`)) return;
    this.loading = true;
    try {
      await deleteDoc(doc(this.firestore, 'users', user.id));
      this.users = this.users.filter(u => u.id !== user.id);
    } catch (e: any) {
      this.error = e.message || 'Failed to remove user';
    } finally {
      this.loading = false;
    }
  }
}
