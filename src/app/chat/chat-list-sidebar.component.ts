import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService, Chat } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { collection, getDocs, Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'chat-list-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding:0.5rem 1rem;">
      <div *ngIf="chats().length === 0" style="color:#888;">No chats yet.</div>
      <div *ngFor="let chat of chats()" style="padding:0.7em 0;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;">
        <div (click)="openChat(chat.id!)" style="flex:1;">
          <b>Chat with:</b> {{ getOtherParticipants(chat.participants) }}
        </div>
        <button
          class="delete-chat-btn"
          (click)="deleteChat(chat.id!); $event.stopPropagation();"
          title="Delete Chat"
          type="button"
          style="margin-left:0.5em;"
        >🗑️</button>
      </div>
    </div>
  `
})
export class ChatListSidebarComponent implements OnInit, OnDestroy {
  chats = signal<Chat[]>([]);
  userId = '';
  usersById: Record<string, string> = {};
  private unsubscribe?: () => void;

  constructor(
    private chatService: ChatService,
    public authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    const user = this.authService.user();
    if (!user) return;
    this.userId = user.uid;

    // Fetch users for UID->email mapping
    const firestore = (this.authService as any).firestore as Firestore;
    if (firestore) {
      const usersSnap = await getDocs(collection(firestore, 'users'));
      usersSnap.forEach((doc: any) => {
        const data = doc.data();
        if (data && data.email) {
          this.usersById[doc.id] = data.email;
        }
      });
    }

    this.unsubscribe = this.chatService.listenToUserChats(user.uid, chats => {
      // Replace UIDs in chat participants with emails if possible
      const mappedChats = chats.map(chat => ({
        ...chat,
        participants: chat.participants.map(pid =>
          this.usersById[pid]
            ? this.usersById[pid]
            : (pid === 'ynatz.ynatz@gmail.com' || pid === 'admin')
              ? 'Admin'
              : pid
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

  getOtherParticipants(participants: string[]) {
    const user = this.authService.user();
    const userEmail = user?.email;
    const userUid = user?.uid;
    const others = participants.filter(
      p => p !== userUid && p !== userEmail
    );
    if (others.length === 1 && others[0] === 'Admin') {
      return 'Admin';
    }
    return others
      .map(p => {
        if (p === 'Admin') return 'Admin';
        if (p.includes('@')) return p;
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }

  async deleteChat(chatId: string) {
    if (confirm('Are you sure you want to delete this chat?')) {
      const firestore = (this.authService as any).firestore as Firestore;
      if (firestore) {
        const { doc, deleteDoc } = await import('@angular/fire/firestore');
        await deleteDoc(doc(firestore, 'chats', chatId));
      }
      this.chats.set(this.chats().filter(c => c.id !== chatId));
    }
  }
}
