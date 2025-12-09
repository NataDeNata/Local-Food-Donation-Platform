import { Component, signal, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { ChatService } from '../services/chat.service';
import { filter } from 'rxjs/operators';
import { User } from '@angular/fire/auth';
import { ChatListSidebarComponent } from './chat/chat-list-sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet, CommonModule, ChatListSidebarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  mobileMenuOpen = signal(false);
  loading = signal(true);
  private intervalId?: any;
  unreadChatsCount = signal(0);
  showChatSidebar = signal(false);

  constructor(
    public themeService: ThemeService,
    public authService: AuthService,
    private router: Router,
    private chatService: ChatService // <-- inject ChatService
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        setTimeout(() => this.loading.set(false), 200); // small delay for smoothness
      }
    });

    // Redirect unverified users to login
    this.checkUnverifiedUser();

    // Listen for unread chat notifications
    this.listenForUnreadChats();
  }

  private checkUnverifiedUser() {
    // Store interval id so it can be cleared if needed
    this.intervalId = setInterval(() => {
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

  private listenForUnreadChats() {
    const user = this.authService.user();
    if (!user) return;
    this.chatService.listenToUserChats(user.uid, chats => {
      // Assume each chat has a 'lastMessage' and 'lastReadTimestamp' for the user
      let unread = 0;
      chats.forEach(chat => {
        // You may want to store lastReadTimestamp per user in chat doc or subcollection
        if (chat.lastMessage && chat.lastMessage.timestamp > (chat.lastReadTimestamp?.[user.uid] || 0)) {
          unread++;
        }
      });
      this.unreadChatsCount.set(unread);
      // Optionally, attach to user object for template
      (user as any).unreadChatsCount = unread;
    });
  }

  ngOnDestroy() {
    // Clear interval to prevent memory leaks
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }

  openChatSidebar() {
    this.showChatSidebar.set(true);
  }
  closeChatSidebar() {
    this.showChatSidebar.set(false);
  }

  logout() {
    this.authService.logout();
    window.location.href = '/login';
  }
}