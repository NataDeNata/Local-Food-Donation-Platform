import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  CollectionReference,
  query,
  where,
  onSnapshot,
  orderBy,
  runTransaction
} from '@angular/fire/firestore';

export interface ChatMessage {
  sender: string; // user UID or email
  text: string;
  timestamp: number;
}

export interface Chat {
  id?: string;
  participants: string[];
  createdAt: number;
  lastMessage?: {
    text: string;
    sender: string;
    timestamp: number;
  };
  lastReadTimestamp?: { [uid: string]: number };
}

/**
 * Service for managing chat creation, messaging, and real-time chat updates.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly chatsCol: CollectionReference;

  /**
   * Constructor injects Firestore dependency and initializes chat collection reference.
   * @param firestore AngularFire Firestore instance
   */
  constructor(public readonly firestore: Firestore) {
    this.chatsCol = collection(this.firestore, 'chats');
  }

  /**
   * Creates a new chat or retrieves an existing one between participants.
   * @param participants Array of participant user IDs or emails
   * @returns The chat ID
   */
  async createChat(participants: string[]): Promise<string> {
    // Always store participants sorted for consistency
    const sortedParticipants = [...participants].sort();
    // Try to find existing chat with exact same participants (order-insensitive)
    const q = query(
      this.chatsCol,
      where('participants', 'array-contains', sortedParticipants[0])
    );
    const snapshot = await getDocs(q);
    // Find a chat where participants array matches exactly (order-insensitive)
    const found = snapshot.docs.find(doc =>
      Array.isArray(doc.data()['participants']) &&
      doc.data()['participants'].length === sortedParticipants.length &&
      doc.data()['participants'].every((p: string) => sortedParticipants.includes(p))
    );
    if (found) {
      return found.id;
    }
    const docRef = await addDoc(this.chatsCol, {
      participants: sortedParticipants,
      createdAt: Date.now()
    });
    return docRef.id;
  }

  /**
   * Sends a message to a specific chat.
   * @param chatId Chat ID
   * @param message ChatMessage object
   */
  async sendMessage(chatId: string, message: ChatMessage) {
    const messagesCol = collection(this.firestore, `chats/${chatId}/messages`);
    await addDoc(messagesCol, message);
  }

  /**
   * Sets up a real-time listener for messages in a chat.
   * @param chatId Chat ID
   * @param callback Function to call with updated messages list
   * @returns Unsubscribe function
   */
  listenToChat(chatId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const messagesCol = collection(this.firestore, `chats/${chatId}/messages`);
    const q = query(messagesCol, orderBy('timestamp', 'asc'));
    return onSnapshot(q, snapshot => {
      const list: ChatMessage[] = snapshot.docs.map(d => d.data() as ChatMessage);
      callback(list);
    });
  }

  /**
   * Sets up a real-time listener for all chats involving a user.
   * @param userIdOrEmail User ID or email
   * @param callback Function to call with updated chats list
   * @returns Unsubscribe function
   */
  listenToUserChats(userIdOrEmail: string, callback: (chats: Chat[]) => void): () => void {
    const q = query(this.chatsCol, where('participants', 'array-contains', userIdOrEmail));
    return onSnapshot(q, snapshot => {
      const list: Chat[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Chat, 'id'>)
      }));
      callback(list);
    });
  }
}
