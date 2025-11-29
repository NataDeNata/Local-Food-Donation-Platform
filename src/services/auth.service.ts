import { Injectable, signal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc
} from '@angular/fire/firestore';

export type UserRole = 'user' | 'admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<User | null>(null);
  userRole = signal<UserRole | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor(private auth: Auth, private firestore: Firestore) {
    // Listen to auth state changes
    onAuthStateChanged(this.auth, async (user) => {
      this.user.set(user);
      if (user) {
        await this.fetchUserRole(user.uid);
      } else {
        this.userRole.set(null);
      }
    });
  }

  private async fetchUserRole(uid: string) {
    const userDoc = doc(this.firestore, 'users', uid);
    const snap = await getDoc(userDoc);
    if (snap.exists()) {
      this.userRole.set((snap.data() as any).role as UserRole);
    } else {
      this.userRole.set('user');
    }
  }

  async signup(email: string, password: string, role: UserRole = 'user') {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);
      // Store user role in Firestore
      const userDoc = doc(this.firestore, 'users', cred.user.uid);
      await setDoc(userDoc, { email, role });
      this.userRole.set(role);
      return true;
    } catch (err: any) {
      this.error.set(err.message || 'Signup failed');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async login(email: string, password: string) {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      await this.fetchUserRole(cred.user.uid);
      return true;
    } catch (err: any) {
      this.error.set(err.message || 'Login failed');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async logout() {
    this.isLoading.set(true);
    try {
      await signOut(this.auth);
      this.userRole.set(null);
    } catch (err: any) {
      this.error.set(err.message || 'Logout failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  isAdmin() {
    return this.userRole() === 'admin';
  }
}
