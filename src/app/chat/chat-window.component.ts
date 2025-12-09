import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- add this
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { collection, getDocs, Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-window">
      <div class="messages">
        <div *ngFor="let msg of messages()">
          <b>{{ msg.sender === userId ? 'You' : msg.sender }}:</b> {{ msg.text }}
        </div>
      </div>
      <form (ngSubmit)="send()" class="chat-input">
        <input [(ngModel)]="text" name="text" placeholder="Type a message..." required autocomplete="off" />
        <button type="submit" class="btn">Send</button>
        <button
          type="button"
          class="delete-chat-btn"
          style="margin-left:0.5em;"
          (click)="deleteChat(); $event.preventDefault();"
          title="Delete Chat"
        >🗑️</button>
      </form>
    </div>
  `,
  styles: [`
    .chat-window { padding: 1rem; }
    .messages { min-height: 200px; max-height: 300px; overflow-y: auto; margin-bottom: 1rem; }
    .chat-input { display: flex; gap: 0.5rem; }
    input { flex: 1; }
  `]
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  messages = signal<ChatMessage[]>([]);
  text = '';
  chatId = '';
  userId = '';
  usersById: Record<string, string> = {};
  private unsubscribe?: () => void;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.userId = this.authService.user()?.uid || '';
    this.route.paramMap.subscribe(async params => {
      const newChatId = params.get('id');
      if (!newChatId) return;
      this.chatId = newChatId;
      // Clean up previous subscription
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = undefined;
      }
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
      this.unsubscribe = this.chatService.listenToChat(this.chatId, msgs => this.messages.set(
        msgs.map(msg => ({
          ...msg,
          sender: this.usersById[msg.sender]
            ? this.usersById[msg.sender]
            : (msg.sender === 'ynatz.ynatz@gmail.com' || msg.sender === 'admin')
              ? 'Admin'
              : msg.sender === this.userId
                ? 'You'
                : msg.sender
        }))
      ));
    });
  }

  ngOnDestroy() {
    this.unsubscribe?.();
  }

  async send() {
    if (!this.text.trim()) return;
    await this.chatService.sendMessage(this.chatId, {
      sender: this.userId,
      text: this.text,
      timestamp: Date.now()
    });
    this.text = '';
  }

  async deleteChat() {
    if (confirm('Are you sure you want to delete this chat?')) {
      const firestore = (this.authService as any).firestore as Firestore;
      if (firestore) {
        const { doc, deleteDoc } = await import('@angular/fire/firestore');
        await deleteDoc(doc(firestore, 'chats', this.chatId));
      }
      this.router.navigate(['/chat']);
    }
  }
}
