import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { Auth, fetchSignInMethodsForEmail } from '@angular/fire/auth';

@Component({
  selector: 'login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
    emailExistsSignal = signal(false);
  email = '';
  password = '';
  confirmPassword = '';
  role: 'user' | 'admin' = 'user';
  adminRequestSent = false;
  passwordMismatch = false;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isSignup = signal(false);
  verificationNotice = false;

  get isInstantAdminSignup() {
    return this.isSignup() && this.email.trim().toLowerCase() === 'ynatz.ynatz@gmail.com';
  }

  constructor(
    public authService: AuthService,
    private readonly router: Router,
    public themeService: ThemeService
  ) {}

  isSignupMode() {
    return this.isSignup();
  }

  toggleSignup() {
    this.isSignup.update((v: boolean) => !v);
    this.authService.error.set(null);
    this.passwordMismatch = false;
    this.adminRequestSent = false;
  }

  async checkEmailExists(email: string) {
    try {
      const auth = this.authService['auth'] as Auth;
      const normalizedEmail = email.trim().toLowerCase();
      let methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
      // If not found, try original email (in case user registered with uppercase/lowercase)
      if (!methods || methods.length === 0) {
        methods = await fetchSignInMethodsForEmail(auth, email.trim());
      }
      this.emailExistsSignal.set(methods && methods.length > 0);
    } catch {
      this.emailExistsSignal.set(false);
    }
  }

  async submit() {
    this.authService.error.set(null);
    this.passwordMismatch = false;
    this.verificationNotice = false;

    // Only allow admin request if admin role is selected
    if (this.isSignup() && this.role === 'admin' && !this.isInstantAdminSignup) {
      // Check registration using fetchSignInMethodsForEmail directly
      const { fetchSignInMethodsForEmail } = await import('@angular/fire/auth');
      const auth = this.authService['auth'];
      const normalizedEmail = this.email.trim().toLowerCase();
      let methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
      if (!methods || methods.length === 0) {
        methods = await fetchSignInMethodsForEmail(auth, this.email.trim());
      }
      if (methods && methods.length > 0) {
        try {
          // Find by lowercased email in users collection for case-insensitive match
          const { getDocs, collection, query, where, updateDoc, doc } = await import('@angular/fire/firestore');
          const firestore = this.authService['firestore'];
          const usersCol = collection(firestore, 'users');
          const q = query(usersCol, where('email', '==', normalizedEmail));
          let snap = await getDocs(q);
          // If not found, try original email (in case data is not normalized)
          if (snap.empty) {
            const q2 = query(usersCol, where('email', '==', this.email.trim()));
            snap = await getDocs(q2);
          }
          if (!snap.empty) {
            const userDoc = doc(firestore, 'users', snap.docs[0].id);
            await updateDoc(userDoc, { pendingAdmin: true, role: 'admin' });
            this.adminRequestSent = true;
            return;
          }
        } catch (e) {
          this.authService.error.set('Failed to submit admin request.');
          return;
        }
      } else {
        this.authService.error.set('This email is not registered. Please sign up first.');
        return;
      }
    }

    if (this.isSignup() && !this.isInstantAdminSignup && this.password !== this.confirmPassword) {
      this.passwordMismatch = true;
      return;
    }

    if (!this.isSignup()) {
      const success = await this.authService.login(this.email, this.password);
      if (success) {
        this.router.navigate(['/']);
      }
    } else {
      if (this.isInstantAdminSignup) {
        const result = await this.authService.instantAdminSignup(this.email, this.password);
        if (result) {
          this.router.navigate(['/']);
        }
        return;
      }
      const result = await this.authService.signup(this.email, this.password, this.role);
      if (result && result.needsVerification) {
        this.verificationNotice = true;
        this.email = '';
        this.password = '';
        this.confirmPassword = '';
      }
    }
  }
}
