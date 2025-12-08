import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService, Chat } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { collection, getDocs, Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'chat-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chat-list">
      <h2>Your Chats</h2>
      <button class="btn" (click)="startNewChat()">Start New Chat</button>
      <ul>
        <li *ngFor="let chat of chats()" style="display:flex;align-items:center;justify-content:space-between;">
          <span (click)="openChat(chat.id!)" style="flex:1;cursor:pointer;">
            Chat with: {{ getOtherParticipants(chat.participants) }}
          </span>
          <button
            class="delete-chat-btn"
            (click)="deleteChat(chat.id!); $event.stopPropagation();"
            title="Delete Chat"
            type="button"
          >🗑️</button>
        </li>
      </ul>
    </div>
  `,
  styleUrls: ['./chat-list.component.css']
})
export class ChatListComponent implements OnInit, OnDestroy {
  chats = signal<Chat[]>([]);
  private unsubscribe?: () => void;
  usersById: Record<string, string> = {}; // uid -> email

  constructor(
    private chatService: ChatService,
    public authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    const user = this.authService.user();
    if (!user) return;

    // Get Firestore instance from AuthService (recommended, as ChatService may not expose it)
    const firestore = (this.authService as any).firestore as Firestore;
    if (firestore) {
      // Fetch all users and map UID to email
      const usersSnap = await getDocs(collection(firestore, 'users'));
      usersSnap.forEach((doc: any) => {
        const data = doc.data();
        if (data && data.email) {
          this.usersById[doc.id] = data.email;
        }
      });
    }

    // Wait for usersById to be populated before showing chats
    this.unsubscribe = this.chatService.listenToUserChats(user.uid, chats => {
      // Replace UIDs in chat participants with emails if possible
      const mappedChats = chats.map(chat => ({
        ...chat,
        participants: chat.participants.map(pid =>
          this.usersById[pid] ? this.usersById[pid] : pid
        )
      }));
      this.chats.set(mappedChats);
    });
  }

  ngOnDestroy() {
    this.unsubscribe?.();
  }

  openChat(chatId: string) {
    this.router.navigate(['/chat', chatId]);
  }

  startNewChat() {
    this.router.navigate(['/chat/new']);
  }

  getOtherParticipants(participants: string[]) {
    const user = this.authService.user();
    // Remove current user (by email or UID) from participants
    const userEmail = user?.email;
    const userUid = user?.uid;
    const others = participants.filter(
      p => p !== userUid && p !== userEmail
    );

    // If admin, label as 'Admin'
    if (others.length === 1 && (others[0] === 'ynatz.ynatz@gmail.com' || others[0] === 'admin')) {
      return 'Admin';
    }

    // Only show emails or 'Admin', never UID
    return others
      .map(p => {
        if (p === 'ynatz.ynatz@gmail.com' || p === 'admin') return 'Admin';
        if (p.includes('@')) return p;
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }

  async deleteChat(chatId: string) {
    if (confirm('Are you sure you want to delete this chat?')) {
      // Remove chat document from Firestore
      const firestore = (this.authService as any).firestore as Firestore;
      if (firestore) {
        const { doc, deleteDoc } = await import('@angular/fire/firestore');
        await deleteDoc(doc(firestore, 'chats', chatId));
      }
      // Optionally, remove from local state immediately
      this.chats.set(this.chats().filter(c => c.id !== chatId));
    }
  }
}
