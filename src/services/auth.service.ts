import { Injectable, signal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  fetchSignInMethodsForEmail,
  getAuth
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc
} from '@angular/fire/firestore';
import { sendEmailVerification } from 'firebase/auth';

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
      // Allow default admin to bypass email verification check
      if (
        user &&
        user.email === 'ynatz.ynatz@gmail.com'
      ) {
        this.user.set(user);
        const userDoc = doc(this.firestore, 'users', user.uid);
        const snap = await getDoc(userDoc);
        if (snap.exists()) {
          this.userRole.set((snap.data() as any).role as UserRole);
        } else {
          await setDoc(userDoc, { email: user.email, role: 'admin' });
          this.userRole.set('admin');
        }
        return;
      }

      // Block user entirely if not verified (but NOT for admin)
      if (user && !user.emailVerified && user.email !== 'ynatz.ynatz@gmail.com') {
        await signOut(this.auth);
        this.user.set(null);
        this.userRole.set(null);
        this.error.set('Please verify your email address before logging in.');
        return;
      }
      this.user.set(user);
      // Only fetch user role if user record exists (i.e., after verification and first login)
      if (user) {
        const userDoc = doc(this.firestore, 'users', user.uid);
        const snap = await getDoc(userDoc);
        if (snap.exists()) {
          this.userRole.set((snap.data() as any).role as UserRole);
        } else {
          // If user is verified and no Firestore record, create it now
          await setDoc(userDoc, { email: user.email, role: 'user' });
          this.userRole.set('user');
        }
      } else {
        this.userRole.set(null);
      }
    });
  }

  async signup(email: string, password: string, role: UserRole = 'user') {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);

      // Always send verification email after signup
      await sendEmailVerification(cred.user, {
        url: 'https://local-food-donation-1664b.firebaseapp.com/',
        handleCodeInApp: false // <-- set to false for standard email verification
      });

      // Immediately sign out so user is not logged in
      await signOut(this.auth);

      // Do NOT create user record in Firestore here!
      // Only show verification notice to user
      return { needsVerification: true };
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
      // Special case: default admin account
      if (
        email === 'ynatz.ynatz@gmail.com' &&
        password === 'N@cko.wick1105'
      ) {
        // Try to sign in, or create the account if it doesn't exist
        try {
          const cred = await signInWithEmailAndPassword(this.auth, email, password);
          // Ensure Firestore admin record exists
          const userDoc = doc(this.firestore, 'users', cred.user.uid);
          const snap = await getDoc(userDoc);
          if (!snap.exists()) {
            await setDoc(userDoc, { email, role: 'admin' });
          }
          await this.fetchUserRole(cred.user.uid);
          return true;
        } catch (err: any) {
          // If user does not exist, create it
          if (err.code === 'auth/user-not-found') {
            const cred = await createUserWithEmailAndPassword(this.auth, email, password);
            // Mark as verified (Firebase will not auto-verify, but for dev you can skip check)
            Object.defineProperty(cred.user, 'emailVerified', { value: true });
            const userDoc = doc(this.firestore, 'users', cred.user.uid);
            await setDoc(userDoc, { email, role: 'admin' });
            await this.fetchUserRole(cred.user.uid);
            return true;
          } else if (err.code === 'auth/wrong-password') {
            this.error.set('Incorrect password.');
            return false;
          } else {
            this.error.set(err.message || 'Login failed');
            return false;
          }
        }
      }

      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      // Check if email is verified
      if (!cred.user.emailVerified) {
        await sendEmailVerification(cred.user, {
          url: 'https://local-food-donation-1664b.firebaseapp.com/',
          handleCodeInApp: false // <-- set to false for standard email verification
        });
        this.error.set('Please verify your email address. A verification link has been sent.');
        await signOut(this.auth);
        return false;
      }
      // Only now create user record in Firestore if not exists
      const userDoc = doc(this.firestore, 'users', cred.user.uid);
      const snap = await getDoc(userDoc);
      if (!snap.exists()) {
        await setDoc(userDoc, { email, role: 'user' });
      }
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

  async checkEmailExists(email: string): Promise<boolean> {
    const auth = getAuth();
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods && methods.length > 0;
  }

  setError(msg: string) {
    this.error.set(msg);
  }

  isAdmin() {
    return this.userRole() === 'admin';
  }

  // Make fetchUserRole public so it can be called from login logic
  public async fetchUserRole(uid: string) {
    // Only fetch user role if user record exists (i.e., after verification and first login)
    const userDoc = doc(this.firestore, 'users', uid);
    const snap = await getDoc(userDoc);
    if (snap.exists()) {
      this.userRole.set((snap.data() as any).role as UserRole);
    } else {
      // Do not set a default role or create a user record here
      this.userRole.set(null);
    }
  }

  // Add this method for instant admin signup
  async instantAdminSignup(email: string, password: string) {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // Try to sign in, or create the account if it doesn't exist
      try {
        const cred = await signInWithEmailAndPassword(this.auth, email, password);
        const userDoc = doc(this.firestore, 'users', cred.user.uid);
        const snap = await getDoc(userDoc);
        if (!snap.exists()) {
          await setDoc(userDoc, { email, role: 'admin' });
        }
        this.userRole.set('admin');
        this.user.set(cred.user);
        return true;
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          const cred = await createUserWithEmailAndPassword(this.auth, email, password);
          // Mark as verified (for dev convenience)
          Object.defineProperty(cred.user, 'emailVerified', { value: true });
          const userDoc = doc(this.firestore, 'users', cred.user.uid);
          await setDoc(userDoc, { email, role: 'admin' });
          this.userRole.set('admin');
          this.user.set(cred.user);
          return true;
        } else if (err.code === 'auth/wrong-password') {
          this.error.set('Incorrect password.');
          return false;
        } else {
          this.error.set(err.message || 'Signup failed');
          return false;
        }
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
