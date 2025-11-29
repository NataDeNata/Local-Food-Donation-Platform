import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserRole } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

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
  readonly isSignup = signal(false);
  role: UserRole = 'user';
  adminRequestSent = false;
  passwordMismatch = false;
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor(
    public authService: AuthService,
    private readonly router: Router,
    public themeService: ThemeService
  ) {}

  async submit() {
    if (!this.email) return;

    if (this.isSignup() && this.role === 'admin') {
      // Do not create an account, just show pending message
      this.adminRequestSent = true;
      return;
    }

    if (!this.password) return;

    if (this.isSignup() && this.password !== this.confirmPassword) {
      this.passwordMismatch = true;
      return;
    } else {
      this.passwordMismatch = false;
    }

    let success = false;
    if (this.isSignup()) {
      success = await this.authService.signup(this.email, this.password, this.role);
    } else {
      success = await this.authService.login(this.email, this.password);
    }
    if (success) {
      this.router.navigateByUrl('/');
    }
  }

  toggleSignup() {
    this.isSignup.update(v => !v);
    this.adminRequestSent = false;
    this.role = 'user';
    this.passwordMismatch = false;
    this.password = '';
    this.confirmPassword = '';
  }
}
