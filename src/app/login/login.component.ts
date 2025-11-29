import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { Auth, fetchSignInMethodsForEmail } from '@angular/fire/auth';

@Component({
  selector: 'login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
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

  async emailExists(email: string): Promise<boolean> {
    try {
      const auth = this.authService['auth'] as Auth;
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods && methods.length > 0;
    } catch {
      return false;
    }
  }

  async submit() {
    this.authService.error.set(null);
    this.passwordMismatch = false;
    this.verificationNotice = false;

    // Only allow admin request if admin role is selected
    if (this.isSignup() && this.role === 'admin' && !this.isInstantAdminSignup) {
      this.adminRequestSent = true;
      return;
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
