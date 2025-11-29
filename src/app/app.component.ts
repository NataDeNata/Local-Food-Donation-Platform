import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { filter } from 'rxjs/operators';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  mobileMenuOpen = signal(false);
  loading = signal(true);

  constructor(
    public themeService: ThemeService,
    public authService: AuthService,
    private router: Router
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        setTimeout(() => this.loading.set(false), 200); // small delay for smoothness
      }
    });

    // Redirect unverified users to login
    this.checkUnverifiedUser();
  }

  private checkUnverifiedUser() {
    setInterval(() => {
      const user = this.authService.user();
      // Allow default admin to bypass email verification redirect
      if (
        user &&
        !user.emailVerified &&
        user.email !== 'ynatz.ynatz@gmail.com'
      ) {
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    }, 1000);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }

  logout() {
    this.authService.logout();
    window.location.href = '/login';
  }
}