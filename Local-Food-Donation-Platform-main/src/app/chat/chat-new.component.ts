import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- add this
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'chat-new',
  standalone: true,
  imports: [CommonModule, FormsModule], // <-- add FormsModule here
  template: `
    <div class="chat-new">
      <h2>Start New Chat</h2>
      <form (ngSubmit)="startChat()">
        <label>Recipient UID or Email:</label>
        <input [(ngModel)]="recipient" name="recipient" required />
        <button type="submit" class="btn">Start Chat</button>
      </form>
    </div>
  `
})
export class ChatNewComponent {
  recipient = '';

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router
  ) {}

  async startChat() {
    const user = this.authService.user();
    if (!user || !this.recipient.trim()) return;
    const chatId = await this.chatService.createChat([user.uid, this.recipient.trim()]);
    this.router.navigate(['/chat', chatId]);
  }
}
